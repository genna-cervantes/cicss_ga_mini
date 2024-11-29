import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// GA
// chromosome generation
const SCHOOL_DAYS = ['M', 'T', 'W', 'TH', 'F', 'S'];
const SCHOOL_HOURS = {
    start: '0700',
    end: '2100'
};

const DB_HOST = 'localhost';
const DB_PORT = 5432;
const DB_USER = 'postgres';
const DB_PASSWORD = 'password';
const DB_NAME = 'postgres';

const client = new Client({
    host: DB_HOST,
    port: DB_PORT, // Use a default port if not specified
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
});

// Connect to PostgreSQL
client
    .connect()
    .then(() => {
        console.log('Connected to PostgreSQL database');
    })
    .catch((err) => {
        console.error('Connection error', err.stack);
    });

let chromosomes = [];

// ung sa gened na gap

const generateClassGene = async ({
    dept,
    year,
    sem,
    sections
}: {
    dept: string;
    year: number;
    sem: number;
    sections: number;
}) => {
    // need curriculum dept year sem
    try {
        // Using parameterized query to avoid SQL injection
        const query =
            'SELECT * FROM curriculum WHERE department = $1 AND year = $2 AND semester = $3 LIMIT 1';
        const res = await client.query(query, [dept, year, sem]);

        const curriculum = res.rows[0];
        const specialization = curriculum.specialization;
        const courses = curriculum.courses;
        const yearLevelConstraints = {
            M: [
                {
                    start: '1600',
                    end: '2100'
                }
            ],
            T: [
                {
                    start: '1600',
                    end: '2100'
                }
            ],
            W: [
                {
                    start: '1600',
                    end: '2100'
                }
            ],
            TH: [
                {
                    start: '0700',
                    end: '2100'
                }
            ],
            F: [
                {
                    start: '0700',
                    end: '2100'
                }
            ],
            S: [
                {
                    start: '0700',
                    end: '2100'
                }
            ]
        };

        // console.log(courses)

        // dapat per section i2
        // track course units
        let weeklyCourseUnits: any = {};

        // track prof units
        let weeklyProfUnits: any = {};

        // track time blocks
        let weeklyRoomUnits: any = {}; // max 14

        // track time blocks
        let weeklyTimeBlockConstraints: any = {
            M: [],
            T: [],
            W: [],
            TH: [],
            F: [],
            S: []
        };

        let weeklyUnits: any = {};

        // loop through sections
        loop1: for (let i = 0; i < sections; i++) {
            // loop thru school days
            loop2: for (let j = 0; j < SCHOOL_DAYS.length; j++) {
                let schoolDay = SCHOOL_DAYS[j];
                let courseAssigned = false;
                let scheduleBlock;
                let tries = 0;

                console.log('SCHOOL DAY: ', schoolDay);

                // Try to assign a valid course for the current day
                // habang may avail time pa mag assign pa ng course

                // while keri pa ng time
                let availableTime = weeklyUnits[schoolDay] || 9;
                console.log('1', availableTime);

                while (availableTime > 2) {
                    // courseDetails.units
                    loop4: while (!courseAssigned) {
                        tries++;

                        // wala n tlga beh
                        if (tries >= 100) {
                            break loop1;
                        }
                        let courseDetails;
                        let profDetails;
                        let roomDetails;

                        // get random course
                        let course =
                            courses[Math.floor(Math.random() * courses.length)];

                        // check if pwede pa from the course units

                        courseAssigned = true;
                        // console.log('2', course);
                        courseDetails = await getCourseDetails(course);

                        let assignedUnits =
                            weeklyCourseUnits[course]?.units || 0;

                        if (assignedUnits >= courseDetails.total_units) {
                            continue loop4;
                        }

                        // add sa units nung course
                        if (courseDetails) {
                            // console.log("course: ", courseDetails);

                            // handler for gened subjects profs
                            if (courseDetails.category === 'gened') {
                                profDetails = { professor_id: 'GENDED PROF' };
                            } else {
                                // get prof for course
                                profDetails = await getProfFromCourse({
                                    courseDetails,
                                    weeklyProfUnits,
                                    dept
                                });

                                if (profDetails) {
                                    if (
                                        weeklyProfUnits[
                                            profDetails.professor_id
                                        ]?.units
                                    ) {
                                        weeklyProfUnits[
                                            profDetails.professor_id
                                        ].units += profDetails.units;
                                    } else {
                                        weeklyProfUnits = {
                                            units: profDetails.units
                                        };
                                    }
                                } else {
                                    console.log('no more prof possibilities');
                                    break loop2;
                                }
                            }
                            // console.log("prof: ", profDetails);

                            // handler for pathfit room
                            if (
                                courseDetails.subject_code.startsWith('PATHFIT')
                            ) {
                                roomDetails = { room_id: 'PE ROOM' };
                            } else {
                                // get room for course
                                roomDetails = await getRoomFromCourse({
                                    courseDetails,
                                    weeklyRoomUnits,
                                    dept
                                });

                                // add sa units nung course
                                if (roomDetails) {
                                    if (
                                        weeklyRoomUnits[roomDetails.room_id]
                                            ?.units
                                    ) {
                                        // HARDCODED
                                        weeklyRoomUnits[
                                            roomDetails.room_id
                                        ].units +=
                                            courseDetails.units_per_class;
                                    } else {
                                        weeklyRoomUnits[roomDetails.room_id] = {
                                            units: courseDetails.units_per_class
                                        };
                                    }
                                } else {
                                    console.log('no more room possibilities');
                                    break loop2;
                                }
                            }
                            //  console.log("room: ", roomDetails);

                            // get random time slot for course
                            let timeBlock = getTimeBlockFromCourse({
                                courseDetails,
                                yearLevelConstraints,
                                weeklyTimeBlockConstraints,
                                schoolDay
                            });
                            if (timeBlock) {
                                if (courseDetails.subject_code.startsWith('PATHFIT')){
                                    weeklyTimeBlockConstraints[schoolDay].push(
                                        timeBlock.allowance
                                    );
                                }else{
                                    weeklyTimeBlockConstraints[schoolDay].push(
                                        timeBlock.timeBlock
                                    );
                                }
                            } else {
                                console.log(
                                    'no more time block possibilities for school day'
                                );
                                continue loop2;
                            }
                            //   console.log("timeBlock: ", timeBlock);

                            // add class units to weekly tracker
                            if (weeklyUnits[schoolDay]?.units) {
                                weeklyUnits[schoolDay].units -=
                                    courseDetails.units_per_class;
                            } else {
                                weeklyUnits[schoolDay] = {
                                    units: 9 - courseDetails.units_per_class
                                };
                            }

                            //   console.log(weeklyTimeBlockConstraints);

                            console.log({
                                course: courseDetails,
                                prof: profDetails,
                                room: roomDetails,
                                timeBlock: timeBlock.timeBlock
                            });

                            // add course units to weekly tracker
                            if (weeklyCourseUnits[course]?.units) {
                                weeklyCourseUnits[course].units +=
                                    courseDetails.units_per_class;
                            } else {
                                weeklyCourseUnits[course] = {
                                    units: courseDetails.units_per_class
                                };
                            }

                            console.log(
                                'weekly course units',
                                weeklyCourseUnits
                            );
                        } else {
                            console.log('no more course possibilities');
                            break loop2;
                        }
                    }

                    courseAssigned = false;
                }

                // assign everything to that section
                // add to yearlevel gene
            }
        }
    } catch (err) {
        console.error('Error executing query', err);
    }
};

generateClassGene({ dept: 'CS', year: 1, sem: 1, sections: 2 });

const getCourseDetails = async (course: string) => {
    const query = 'SELECT * FROM courses WHERE subject_code = $1 LIMIT 1';
    const res = await client.query(query, [course]);
    return res.rows[0];
};

const getProfFromCourse = async ({
    courseDetails,
    weeklyProfUnits,
    dept
}: {
    courseDetails: any;
    weeklyProfUnits: any;
    dept: string;
}) => {
    // ung main dep lng muna kunin
    const query =
        'SELECT * FROM professors WHERE $1 = ANY(courses) AND main_department = $2';
    const res = await client.query(query, [courseDetails.subject_code, dept]);

    const mainAvailableProfs = res.rows;

    let profAssigned = false;
    let tries = 0;

    loop1: while (!profAssigned) {
        // pick random don
        let prof =
            mainAvailableProfs[
                Math.floor(Math.random() * mainAvailableProfs.length)
            ];
        tries++;

        // wala n tlga beh
        if (tries >= 10) {
            break loop1;
        }

        // check if pwede pa from the course units
        let assignedUnits = weeklyProfUnits[prof.professor_id]?.units || 0;
        if (assignedUnits >= prof.units) {
            continue;
        }

        // return ung prof na un
        return prof;
    }

    // pag wala sa main dep kuha sa iba except ung main dep para di maulit
    const query2 =
        'SELECT * FROM professors WHERE $1 = ANY(courses) AND main_department != $2';
    const res2 = await client.query(query2, [courseDetails.subject_code, dept]);

    const subAvailableProfs = res2.rows;

    let profAssigned2 = false;
    let tries2 = 0;
    // Try to assign a valid course for the current day
    loop2: while (!profAssigned2) {
        // pick random don
        let prof =
            subAvailableProfs[
                Math.floor(Math.random() * subAvailableProfs.length)
            ];
        tries2++;

        if (tries2 >= 10) {
            // wala n tlga beh
            break loop2;
        }

        // check if pwede pa from the course units
        let assignedUnits = weeklyProfUnits[prof.professor_id]?.units || 0;
        if (assignedUnits >= prof.units) {
            continue;
        }

        // return ung prof na un
        return prof;
    }

    return null;
};

const getRoomFromCourse = async ({
    courseDetails,
    weeklyRoomUnits,
    dept
}: {
    courseDetails: any;
    weeklyRoomUnits: any;
    dept: string;
}) => {
    const query =
        'SELECT * FROM rooms WHERE main_department = $1 AND type = $2';
    const res = await client.query(query, [dept, courseDetails.type]);

    const mainAvailableRooms = res.rows;

    let roomAssigned = false;
    let tries = 0;

    loop1: while (!roomAssigned) {
        // pick random don
        let room =
            mainAvailableRooms[
                Math.floor(Math.random() * mainAvailableRooms.length)
            ];
        tries++;

        // wala n tlga beh
        if (tries >= 10) {
            break loop1;
        }

        // check if pwede pa from the course units
        let assignedUnits = weeklyRoomUnits[room.room_id]?.units || 0;
        if (assignedUnits >= 14) {
            //HARD CODED PA UNG MAX UNITS NG ISANG ROOM
            continue;
        }

        // return ung prof na un
        return room;
    }

    // pag wala sa main dep kuha sa iba except ung main dep para di maulit
    const query2 = 'SELECT * FROM rooms WHERE main_department = $1';
    const res2 = await client.query(query2, [dept]);

    const subAvailableRooms = res2.rows;

    let roomAssigned2 = false;
    let tries2 = 0;
    // Try to assign a valid course for the current day
    loop2: while (!roomAssigned2) {
        // pick random don
        let room =
            subAvailableRooms[
                Math.floor(Math.random() * subAvailableRooms.length)
            ];
        tries2++;

        if (tries2 >= 10) {
            // wala n tlga beh
            break loop2;
        }

        // check if pwede pa from the course units
        let assignedUnits = weeklyRoomUnits[room.room_id]?.units || 0;
        if (assignedUnits >= 14) {
            continue;
        }

        // return ung prof na un
        return room;
    }

    return null;
};

const getTimeBlockFromCourse = ({
    courseDetails,
    yearLevelConstraints,
    weeklyTimeBlockConstraints,
    schoolDay
}: {
    courseDetails: any;
    yearLevelConstraints: any;
    weeklyTimeBlockConstraints: any;
    schoolDay: string;
}) => {
    let availableRanges = getPossibleTimeRanges({
        yearLevelConstraints,
        weeklyTimeBlockConstraints,
        courseConstraints: courseDetails.restrictions,
        schoolDay
    });

    console.log(availableRanges);

    let timeBlockAssigned = false;
    let tries = 0;

    if (availableRanges.length > 0) {
        loop1: while (!timeBlockAssigned) {
            // pick random don
            let timeBlock =
                availableRanges[
                    Math.floor(Math.random() * availableRanges.length)
                ];

            tries++;

            if (tries >= 100) {
                // wala n tlga beh
                break loop1;
            }

            // random start in the available ranges
            const intervals: number[] = [];
            for (
                let i = timeToMinutes(timeBlock.start);
                i < timeToMinutes(timeBlock.end);
                i += 30
            ) {
                intervals.push(i);
            }

            // console.log(intervals);

            const randomInterval =
                intervals[Math.floor(Math.random() * intervals.length)];

            // console.log(randomInterval);
            let randomStart = minutesToTime(randomInterval);
            // console.log(randomStart);

            let availableMinutes =
                timeToMinutes(timeBlock.end) - timeToMinutes(randomStart);

            // console.log(randomStart)
            // console.log(timeBlock.end)
            // console.log('avail', availableMinutes);

            if (courseDetails.subject_code.startsWith('PATHFIT')) {
                if (timeToMinutes(randomStart) - timeToMinutes('0700') < 120) {
                    if (
                        courseDetails.units_per_class * 60 + 120 >
                        availableMinutes
                    ) {
                        // console.log('oops sobra');
                        continue loop1;
                    }
                } else {
                    if (
                        courseDetails.units_per_class * 60 + 240 >
                        availableMinutes
                    ) {
                        // console.log('oops sobra');
                        continue loop1;
                    }
                }
            } else {
                if (courseDetails.units_per_class * 60 > availableMinutes) {
                    // console.log('oops sobra');
                    continue loop1;
                }
            }

            if (courseDetails.subject_code.startsWith('PATHFIT')) {
                return {
                    allowance: {
                        start: minutesToTime(
                            timeToMinutes(randomStart) - 2 * 60
                        ),
                        end: minutesToTime(
                            60 * 2 +
                                timeToMinutes(randomStart) +
                                courseDetails.units_per_class * 60
                        )
                    },
                    timeBlock: {
                        start: randomStart,
                        end: minutesToTime(
                            timeToMinutes(randomStart) +
                                courseDetails.units_per_class * 60
                        )
                    }
                };
            } else {
                return {
                    timeBlock: {
                        start: randomStart,
                        end: minutesToTime(
                            timeToMinutes(randomStart) +
                                courseDetails.units_per_class * 60
                        )
                    }
                };
            }
        }
    } else {
        return null;
    }
};

const minutesToTime = (totalMinutes: any) => {
    const hours = Math.floor(totalMinutes / 60); // Calculate hours
    const minutes = totalMinutes % 60; // Calculate remaining minutes

    // Format as a padded time string
    return `${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`;
};

const timeToMinutes = (time: any) => {
    // Ensure the time is at least 4 characters (e.g., '530' → '0530')
    const paddedTime = time.toString().padStart(4, '0');

    // Extract hours and minutes
    const hours = parseInt(paddedTime.substring(0, 2), 10); // First two characters as hours
    const minutes = parseInt(paddedTime.substring(2, 4), 10); // Last two characters as minutes

    // Convert to total minutes
    return hours * 60 + minutes;
};

const getPossibleTimeRanges = ({
    yearLevelConstraints,
    weeklyTimeBlockConstraints,
    courseConstraints,
    schoolDay
}: {
    yearLevelConstraints: any;
    weeklyTimeBlockConstraints: any;
    courseConstraints: any;
    schoolDay: string;
}) => {
    const defaultRange = { start: '0700', end: '2100' };
    const constraints = [
        ...yearLevelConstraints[schoolDay],
        ...weeklyTimeBlockConstraints[schoolDay],
        ...courseConstraints[schoolDay]
    ];

    const timeToMinutesInternal = (time: any) => {
        const hours = parseInt(time.substring(0, 2), 10);
        const minutes = parseInt(time.substring(2, 4), 10);
        return hours * 60 + minutes;
    };

    // Helper to convert minutes back to military time
    const minutesToTimeInternal = (minutes: any) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return String(hours).padStart(2, '0') + String(mins).padStart(2, '0');
    };

    // Convert default range to minutes
    const defaultStart = timeToMinutesInternal(defaultRange.start);
    const defaultEnd = timeToMinutesInternal(defaultRange.end);

    // Convert constraints to minutes
    const occupiedRanges = constraints.map((constraint: any) => ({
        start: timeToMinutesInternal(constraint.start),
        end: timeToMinutesInternal(constraint.end)
    }));

    // Sort occupied ranges by start time
    occupiedRanges.sort((a: any, b: any) => a.start - b.start);

    // Merge overlapping constraints
    const mergedRanges = [];
    for (const range of occupiedRanges) {
        if (
            mergedRanges.length === 0 ||
            range.start > mergedRanges[mergedRanges.length - 1].end
        ) {
            mergedRanges.push(range);
        } else {
            mergedRanges[mergedRanges.length - 1].end = Math.max(
                mergedRanges[mergedRanges.length - 1].end,
                range.end
            );
        }
    }

    // Calculate available ranges by subtracting occupied ranges from the default range
    const availableRanges = [];
    let currentStart = defaultStart;

    for (const range of mergedRanges) {
        if (range.start > currentStart) {
            availableRanges.push({ start: currentStart, end: range.start });
        }
        currentStart = Math.max(currentStart, range.end);
    }

    if (currentStart < defaultEnd) {
        availableRanges.push({ start: currentStart, end: defaultEnd });
    }

    // Convert available ranges back to military time
    return availableRanges.map((range) => ({
        start: minutesToTimeInternal(range.start),
        end: minutesToTimeInternal(range.end)
    }));
};

// mini gene

// 1st year 2 days onli tapos 7-4 sila
// cs it is - 1 year level muna and 2 sections per dept

// 1cs - 3 subjects
// comp prog 1 - lab - major
// linear algebra - lec - major
// PE - gened
// thy - lec - gened

// 1it - 3 subjects
// networking 1 - lab - major
// comp prog 1 - lab - major
// PE - gened
// thy - lec -gened

// 1is - 3 subjects
// fundamentals of information systems - lec - major
// comp prog 1 - lab - major
// PE - gened
// thy - lec - gened

// professors

// Darlene Alberto
// comp prog 1
// full time
// load 24
// restrictions - wala
// main dep - cs

// Lawrence Decamora
// comp prog 1
// full time
// load 24
// restrictions - until 4 pm lang
// main dep - cs

// Jonathan Cabero
// linear algebra
// full time
// load 24
// restrictions
// main dep - cs

// Cherry Estabillo
// linear algebra
// full time
// load 24
// restrictions
// main dep - cs

// Random Name0
// comp prog 1
// full time
// load 24
// restrictions
// main dep - it

// Random Name1
// networking 1
// full time
// load 24
// restrictions
// main dep - it

// Random Name2
// networking 1
// part time
// load 12
// restrictions - bawal siya saturday
// main dep - it

// Random Name0
// comp prog 1
// full time
// load 24
// restrictions
// main dep - is

// Random Name3
// fundamentals of info sys
// full time
// load 24
// restrictions
// main dep - is

// Random Name4
// fundamentals of info sys
// full time
// load 24
// restrictions
// main dep - is

// rooms
// 1801 lab, 1802 - cs
// 1803 lab, 1804 - it
// 1805 lab, 1806 - is
