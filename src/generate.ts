import { Client } from 'pg';
import dotenv from 'dotenv';
import { SCHOOL_DAYS } from './constants';
import { evaluateFitnessScore } from './fitnessFunctions';

dotenv.config();

// GA
// chromosome generation

const DB_HOST = 'localhost';
const DB_PORT = 5432;
const DB_USER = 'postgres';
const DB_PASSWORD = 'password';
const DB_NAME = 'postgres';

export const client = new Client({
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

const generateYearGene = async ({
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

        let genedCourses = getCoursesFromCurriculum(courses).gened;
        let majorCourses = getCoursesFromCurriculum(courses).major;

        let coursesCopy = courses;

        const query2 =
            'SELECT restrictions FROM year_time_restrictions WHERE department = $1 AND year = $2';
        const res2 = await client.query(query2, [dept, year]);
        const yearLevelTimeConstraints = res2.rows[0].restrictions;

        const query3 =
            'SELECT available_days, max_days FROM year_day_restrictions WHERE department = $1 AND year = $2';
        const res3 = await client.query(query3, [dept, year]);
        const yearLevelAvailableDays =
            res3.rows[0]?.available_days || SCHOOL_DAYS;
        const yearLevelMaxDays = res3.rows[0]?.max_days || 6;

        // console.log(courses)
        let yearGene: any = [];
        let gene;
        let sectionNames = generateSectionNames({
            year,
            dept,
            sectionNumber: sections
        });

        // ung mga shared like profs and rooms is outside sa section loop para di mag reset per section
        // track prof units
        let weeklyProfUnits: any = {};
        let weeklyProfTimeBlocks: any = {};
        let weeklyRoomUnits: any = {}; // max 14
        // rm 1806: {
        //     M: [],
        //     T: [],
        //     W: [],
        //     TH: [],
        //     F: [],
        //     S: []
        // }

        // loop through sections
        loop1: for (let i = 0; i < sectionNames.length; i++) {
            console.log(sectionNames[i]);

            let sectionName = sectionNames[i];
            let weeklyCourseUnits: any = {};

            // track time blocks
            let weeklyTimeBlockConstraints: any = {
                M: [],
                T: [],
                W: [],
                TH: [],
                F: [],
                S: []
            };

            let weeklyGenedConstraints: any = {
                M: [],
                T: [],
                W: [],
                TH: [],
                F: [],
                S: []
            };
            // {M: [THY], T: [FELEC]}

            let weeklyUnits: any = {};

            let schedule: any = {
                M: [],
                T: [],
                W: [],
                TH: [],
                F: [],
                S: []
            };

            let genedAssignedCourses = 0;
            let genedCoursesCopy = genedCourses;
            let majorCoursesCopy = majorCourses;

            // loop thru available school days
            loop2: for (let j = 0; j < yearLevelAvailableDays.length; j++) {
                let schoolDay = yearLevelAvailableDays[j];
                let courseAssigned = false;
                let tries = 0;

                // tatanggalin sa dailly copy kapag no time possiblities and gap problem
                // tatanggalin sa genedcourses copy kapag fully assigned na => matatanggal din sa daily copy
                // check kung may assignable pa sa day na toh
                let genedCoursesDailyCopy = genedCoursesCopy;
                let majorCoursesDailyCopy = majorCoursesCopy;

                // check if max days reached
                let assignedDays = checkNumberOfAssignedDays(schedule);
                if (assignedDays >= yearLevelMaxDays) {
                    console.log('max assigend days');
                    break loop2;
                }

                console.log('SCHOOL DAY: ', schoolDay);

                // Try to assign a valid course for the current day
                // habang may avail time pa mag assign pa ng course

                // while keri pa ng time
                let availableTime = weeklyUnits[schoolDay] || 8;
                // console.log('1', availableTime);

                loop3: while (availableTime > 1.5) { // minimum 1.5 hours
                    // gap logic for gened subs

                    loop4: while (!courseAssigned) {
                        tries++;

                        // wala n tlga beh or check if puno na ung units
                        let unitsComplete = await checkIfUnitsComplete({
                            weeklyCourseUnits,
                            courses
                        });
                        if (tries >= 100 || unitsComplete) {
                            console.log('enough tries || complete assignment');
                            break loop3;
                        }
                        let courseDetails;
                        let profDetails;
                        let roomDetails;

                        if (
                            genedCoursesDailyCopy.length <= 0 &&
                            majorCoursesDailyCopy.length <= 0
                        ) {
                            // assigned na lahat ng courses
                            console.log(genedCourses)
                            console.log(majorCourses)
                            console.log(genedCoursesCopy)
                            console.log(majorCoursesCopy)
                            console.log('assigned n lahat wla na gened nd major courses copy')
                            continue loop2;
                        }
                        
                        // get random course
                        let probabilityGened =
                        1 - genedAssignedCourses / genedCourses.length;
                        let course;

                        // nassturck siya here
                        // kung MT lang saka tapos pag tapos random na
                        if (schoolDay === 'M' || schoolDay === 'T' || schoolDay === 'F') {

                            if (Math.random() < probabilityGened) {
                                if (genedCoursesDailyCopy.length > 0) {
                                    course =
                                        genedCoursesDailyCopy[
                                            Math.floor(
                                                Math.random() *
                                                    genedCoursesDailyCopy.length
                                            )
                                        ];
                                } else {
                                    course =
                                        majorCoursesDailyCopy[
                                            Math.floor(
                                                Math.random() *
                                                    majorCoursesDailyCopy.length
                                            )
                                        ];
                                }
                            } else {
                                if (majorCoursesDailyCopy.length > 0) {
                                    course =
                                        majorCoursesDailyCopy[
                                            Math.floor(
                                                Math.random() *
                                                    majorCoursesDailyCopy.length
                                            )
                                        ];
                                } else {
                                    course =
                                        genedCoursesDailyCopy[
                                            Math.floor(
                                                Math.random() *
                                                    genedCoursesDailyCopy.length
                                            )
                                        ];
                                }
                            }
                        } else {
                            let allCourses = [
                                ...genedCoursesDailyCopy,
                                ...majorCoursesDailyCopy
                            ];
                            course =
                                allCourses[
                                    Math.floor(
                                        Math.random() * (allCourses.length)
                                    )
                                ];
                        }

                        console.log(course);

                        // check if pwede pa from the course units

                        courseAssigned = true;
                        // console.log('2', course);
                        courseDetails = await getCourseDetails(course);

                        let assignedUnits =
                            weeklyCourseUnits[course]?.units || 0;


                        // check if pwede pa sa units
                        if (assignedUnits >= courseDetails.total_units) {
                            console.log('sobra na units');

                            if (courseDetails.category == 'gened') {
                                genedCoursesCopy =
                                    removeFromGenedCoursesCompleteUnits({
                                        subjectCode: courseDetails.subject_code,
                                        genedCourses: genedCoursesCopy
                                    });
                                genedCoursesDailyCopy =
                                    removeFromGenedCoursesCompleteUnits({
                                        subjectCode: courseDetails.subject_code,
                                        genedCourses: genedCoursesDailyCopy
                                    });
        
                            } else {
                                majorCoursesCopy =
                                    removeFromMajorCoursesCompleteUnits({
                                        subjectCode: courseDetails.subject_code,
                                        majorCourses: majorCoursesCopy
                                    });
                                majorCoursesDailyCopy =
                                    removeFromMajorCoursesCompleteUnits({
                                        subjectCode: courseDetails.subject_code,
                                        majorCourses: majorCoursesDailyCopy
                                    });
                            }
                            continue loop4; // assign different course
                        }

                        // check if gened and gap
                        if (
                            courseDetails.category === 'gened' &&
                            !courseDetails.subject_code.startsWith('PATHFIT')
                        ) {
                            // need hanapin saang day siya naka assign if naka assign na siya
                            // m
                            // need ung opposite dito -- stricter more prone to incomplete
                            if (
                                weeklyGenedConstraints['M'].includes(
                                    courseDetails.subject_code
                                )
                            ) {
                                // make sure this is the gap day
                                if (schoolDay != 'W' && schoolDay != 'M') {
                                    console.log('sa gap');
                                    // pag ganito tanggalin n sa daily copy ??
                                    genedCoursesDailyCopy =
                                    removeFromGenedCoursesCompleteUnits({
                                        subjectCode: courseDetails.subject_code,
                                        genedCourses: genedCoursesDailyCopy
                                    });
                                    continue loop4;
                                }
                            } else if (
                                weeklyGenedConstraints['T'].includes(
                                    courseDetails.subject_code
                                )
                            ) {
                                // make sure this is the gap day
                                if (schoolDay != 'TH' && schoolDay != 'T') {
                                    console.log('sa gap');
                                    genedCoursesDailyCopy =
                                    removeFromGenedCoursesCompleteUnits({
                                        subjectCode: courseDetails.subject_code,
                                        genedCourses: genedCoursesDailyCopy
                                    });
                                    continue loop4;
                                }
                            } else if (
                                weeklyGenedConstraints['W'].includes(
                                    courseDetails.subject_code
                                )
                            ) {
                                // make sure this is the gap day
                                if (schoolDay != 'W') {
                                    console.log('sa gap');
                                    genedCoursesDailyCopy =
                                    removeFromGenedCoursesCompleteUnits({
                                        subjectCode: courseDetails.subject_code,
                                        genedCourses: genedCoursesDailyCopy
                                    });
                                    continue loop4;
                                }
                            } else if (
                                weeklyGenedConstraints['TH'].includes(
                                    courseDetails.subject_code
                                )
                            ) {
                                // make sure this is the gap day
                                if (schoolDay != 'TH') {
                                    console.log('sa gap');
                                    genedCoursesDailyCopy =
                                    removeFromGenedCoursesCompleteUnits({
                                        subjectCode: courseDetails.subject_code,
                                        genedCourses: genedCoursesDailyCopy
                                    });
                                    continue loop4;
                                }
                            } else if (
                                weeklyGenedConstraints['F'].includes(
                                    courseDetails.subject_code
                                )
                            ) {
                                // make sure this is the gap day
                                if (schoolDay != 'S' && schoolDay != 'F') {
                                    console.log('sa gap');
                                    genedCoursesDailyCopy =
                                    removeFromGenedCoursesCompleteUnits({
                                        subjectCode: courseDetails.subject_code,
                                        genedCourses: genedCoursesDailyCopy
                                    });
                                    continue loop4;
                                }
                            } else if (
                                weeklyGenedConstraints['S'].includes(
                                    courseDetails.subject_code
                                )
                            ) {
                                // make sure this is the gap day
                                if (schoolDay != 'S') {
                                    console.log('sa gap');
                                    genedCoursesDailyCopy =
                                    removeFromGenedCoursesCompleteUnits({
                                        subjectCode: courseDetails.subject_code,
                                        genedCourses: genedCoursesDailyCopy
                                    });
                                    continue loop4;
                                }
                            } else {
                                // put it in there
                                weeklyGenedConstraints[schoolDay].push(
                                    courseDetails.subject_code
                                );
                            }
                        }


                        // add sa units nung course
                        if (courseDetails) {
                            // console.log("course: ", courseDetails);

                            // check if may time slot pa na pwede
                            let assignableTimeRanges = checkAssignableTimeRanges({
                                courseDetails,
                                yearLevelTimeConstraints,
                                weeklyTimeBlockConstraints,
                                schoolDay
                            });

                            if (assignableTimeRanges.length <= 0){
                                console.log('no more assignable time ranges for day')
                                continue loop2;
                            }

                            // get random time slot for course
                            let timeBlock = getTimeBlockFromCourse({assignableTimeRanges, courseDetails});
                            if (timeBlock) {
                                if (
                                    courseDetails.subject_code.startsWith(
                                        'PATHFIT'
                                    )
                                ) {
                                    weeklyTimeBlockConstraints[schoolDay].push(
                                        timeBlock.allowance
                                    );
                                } else {
                                    weeklyTimeBlockConstraints[schoolDay].push(
                                        timeBlock.timeBlock
                                    );
                                }
                            } else {
                                // console.log(
                                //     'no more time block possibilities for school day'
                                // );
                                console.log('no time possiblities');
                                // kasi pwede para lng sa course na un walang time pero sa iba pwede (lab)
                                continue loop4; // next day na
                            }
                            //   console.log("timeBlock: ", timeBlock);

                            // handler for lab AND lec courses
                            // check if lab nd lec course ba - check if LB/LC ung dulo ng coursecode
                            if (
                                courseDetails.subject_code.endsWith('LB') ||
                                courseDetails.subject_code.endsWith('LC')
                            ) {
                                // ccheck ko kung may assigned na sa lec / lab na prof
                                let schedBlockWithDupCourse =
                                    findCourseInSchedule({
                                        subject_code:
                                            courseDetails.subject_code,
                                        schedule
                                    });

                                if (schedBlockWithDupCourse) {
                                    // un na ung iaassign ko
                                    profDetails = schedBlockWithDupCourse.prof;
                                } else {
                                    // assign ako bago
                                    profDetails = await getProfFromCourse({
                                        courseDetails,
                                        weeklyProfTimeBlocks,
                                        weeklyProfUnits,
                                        dept,
                                        schoolDay,
                                        timeBlock: timeBlock.timeBlock
                                    });

                                    if (profDetails) {
                                        if (
                                            weeklyProfTimeBlocks[
                                                profDetails.tas_id
                                            ]
                                        ) {
                                            // insert the time block
                                            weeklyProfTimeBlocks[
                                                profDetails.tas_id
                                            ][schoolDay].push(
                                                timeBlock.timeBlock
                                            );

                                            // weeklyProfUnits[
                                            //     profDetails.professor_id
                                            // ].units += profDetails.units;
                                        } else {
                                            weeklyProfTimeBlocks[
                                                profDetails.tas_id
                                            ] = {
                                                M: [],
                                                T: [],
                                                W: [],
                                                TH: [],
                                                F: [],
                                                S: []
                                            };
                                            weeklyProfTimeBlocks[
                                                profDetails.tas_id
                                            ][schoolDay].push(
                                                timeBlock.timeBlock
                                            );
                                        }

                                        if (
                                            weeklyProfUnits[profDetails.tas_id]
                                                ?.units
                                        ) {
                                            if (courseDetails.type === 'lec') {
                                                weeklyProfUnits[
                                                    profDetails.tas_id
                                                ].units += courseDetails.units;
                                            } else if (
                                                courseDetails.type === 'lab'
                                            ) {
                                                weeklyProfUnits[
                                                    profDetails.tas_id
                                                ].units +=
                                                    courseDetails.units * 1.5; // times 1.5 kapag lab
                                            }
                                        } else {
                                            if (courseDetails.type === 'lec') {
                                                weeklyProfUnits[
                                                    profDetails.tas_id
                                                ] = {
                                                    units: courseDetails.units
                                                };
                                            } else if (
                                                courseDetails.type === 'lab'
                                            ) {
                                                weeklyProfUnits[
                                                    profDetails.tas_id
                                                ] = {
                                                    units:
                                                        courseDetails.units *
                                                        1.5
                                                };
                                            }
                                        }
                                    } else {
                                        console.log(
                                            'no more prof possibilities 1'
                                        );
                                        break loop4; // try diff course
                                    }
                                }
                            } else if (courseDetails.category === 'gened') {
                                // handler for gened subjects profs
                                profDetails = { professor_id: 'GENDED PROF' };
                            } else {
                                // get prof for course
                                profDetails = await getProfFromCourse({
                                    courseDetails,
                                    weeklyProfTimeBlocks,
                                    weeklyProfUnits,
                                    dept,
                                    schoolDay,
                                    timeBlock: timeBlock.timeBlock
                                });

                                if (profDetails) {
                                    if (
                                        weeklyProfTimeBlocks[profDetails.tas_id]
                                    ) {
                                        // insert the time block
                                        weeklyProfTimeBlocks[
                                            profDetails.tas_id
                                        ][schoolDay].push(timeBlock.timeBlock);

                                        // weeklyProfUnits[
                                        //     profDetails.professor_id
                                        // ].units += profDetails.units;
                                    } else {
                                        weeklyProfTimeBlocks[
                                            profDetails.tas_id
                                        ] = {
                                            M: [],
                                            T: [],
                                            W: [],
                                            TH: [],
                                            F: [],
                                            S: []
                                        };
                                        weeklyProfTimeBlocks[
                                            profDetails.tas_id
                                        ][schoolDay].push(timeBlock.timeBlock);
                                    }

                                    if (
                                        weeklyProfUnits[profDetails.tas_id]
                                            ?.units
                                    ) {
                                        if (courseDetails.type === 'lec') {
                                            weeklyProfUnits[
                                                profDetails.tas_id
                                            ].units += courseDetails.units;
                                        } else if (
                                            courseDetails.type === 'lab'
                                        ) {
                                            weeklyProfUnits[
                                                profDetails.tas_id
                                            ].units +=
                                                courseDetails.units * 1.5; // times 1.5 kapag lab
                                        }
                                    } else {
                                        if (courseDetails.type === 'lec') {
                                            weeklyProfUnits[
                                                profDetails.tas_id
                                            ] = { units: courseDetails.units };
                                        } else if (
                                            courseDetails.type === 'lab'
                                        ) {
                                            weeklyProfUnits[
                                                profDetails.tas_id
                                            ] = {
                                                units: courseDetails.units * 1.5
                                            };
                                        }
                                    }
                                } else {
                                    console.log('no more prof possibilities 2');
                                    break loop4; // try different prof
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
                                    dept,
                                    schoolDay,
                                    timeBlock: timeBlock.timeBlock
                                });

                                // add sa units nung course
                                if (roomDetails) {
                                    if (
                                        // weeklyRoomUnits[roomDetails.room_id]
                                        //     ?.units
                                        weeklyRoomUnits[roomDetails.room_id]
                                    ) {
                                        // insert the time block
                                        weeklyRoomUnits[roomDetails.room_id][
                                            schoolDay
                                        ].push(timeBlock.timeBlock);

                                        // HARDCODED
                                        // weeklyRoomUnits[
                                        //     roomDetails.room_id
                                        // ].units +=
                                        //     courseDetails.units_per_class;
                                    } else {
                                        weeklyRoomUnits[roomDetails.room_id] = {
                                            M: [],
                                            T: [],
                                            W: [],
                                            TH: [],
                                            F: [],
                                            S: []
                                        };
                                        weeklyRoomUnits[roomDetails.room_id][
                                            schoolDay
                                        ].push(timeBlock.timeBlock);

                                        // weeklyRoomUnits[roomDetails.room_id] = {
                                        //     units: courseDetails.units_per_class
                                        // };
                                    }
                                } else {
                                    console.log('no more room possibilities');
                                    break loop4; // try different course
                                }
                            }
                            //  console.log("room: ", roomDetails);

                            // add class units to weekly tracker
                            if (weeklyUnits[schoolDay]?.units) {
                                weeklyUnits[schoolDay].units -=
                                    courseDetails.units_per_class;
                            } else {
                                weeklyUnits[schoolDay] = {
                                    units: 9 - courseDetails.units_per_class // bakit toh 9 ??
                                };
                            }

                            //   console.log(weeklyTimeBlockConstraints);
                            // console.log({
                            //     course: courseDetails,
                            //     prof: profDetails,
                            //     room: roomDetails,
                            //     timeBlock: timeBlock.timeBlock
                            // });

                            let miniCourseDetails = {
                                subject_code: courseDetails.subject_code,
                                type: courseDetails.type,
                                category: courseDetails.category,
                                units: courseDetails.units_per_class
                            };

                            console.log(timeBlock.timeBlock);
                            console.log('assigned');

                            if (courseDetails.category == 'gened') {
                                genedAssignedCourses++;
                            }

                            schedule[schoolDay].push({
                                course: miniCourseDetails,
                                prof: profDetails,
                                room: roomDetails,
                                timeBlock: timeBlock.timeBlock
                            });

                            // add course units to weekly tracker -- theres definitely a shorthand for this
                            if (weeklyCourseUnits[course]?.units) {
                                weeklyCourseUnits[course].units +=
                                    courseDetails.units_per_class;
                            } else {
                                weeklyCourseUnits[course] = {
                                    units: courseDetails.units_per_class
                                };
                            }

                            // console.log(
                            //     'weekly course units',
                            //     weeklyCourseUnits
                            // );
                        } else {
                            console.log('no more course possibilities');
                            break loop2;
                        }
                    }

                    courseAssigned = false;
                }

                // console.log('schedule', schedule)
                // assign everything to that section
                // add to yearlevel gene
            }

            gene = {
                [sectionName]: schedule
            };

            yearGene.push(gene);
        }

        // console.log(chromosome);
        // printChromosomes(chromosome);
        return yearGene;
    } catch (err) {
        console.error('Error executing query', err);
    }
};

export const generateChromosome = async () => {
    let chromosome = [];

    let CSYearGene1 = await generateYearGene({
        dept: 'CS',
        year: 1,
        sem: 2,
        sections: 4
    });
    chromosome.push({ cs_1st: CSYearGene1 });

    let CSYearGene2 = await generateYearGene({
        dept: 'CS',
        year: 2,
        sem: 2,
        sections: 3
    });
    chromosome.push({ cs_2nd: CSYearGene2 });

    // console.log('done with cs')

    // return chromosome;

    let ITYearGene = await generateYearGene({
        dept: 'IT',
        year: 1,
        sem: 1,
        sections: 2
    });
    chromosome.push({ it_1st: ITYearGene });
    let ISYearGene = await generateYearGene({
        dept: 'IS',
        year: 1,
        sem: 1,
        sections: 2
    });
    chromosome.push({ is_1st: ISYearGene });

    // for (let i = 0; i < chromosome.length; i++) {
    //     const value = Object.values(chromosome[i])[0];
    //     // printYearGene(value);
    // }

    return chromosome;
};

const printYearGene = (yearGene: any) => {
    for (let i = 0; i < yearGene.length; i++) {
        let gene = yearGene[i];
        let geneKeys = Object.keys(gene);
        for (let j = 0; j < geneKeys.length; j++) {
            console.log(geneKeys[j]);
            let geneKey = geneKeys[j];

            let geneKeySchedKeys = Object.keys(gene[geneKey]);
            let section = gene[geneKey];
            console.log(geneKeySchedKeys);
            for (let k = 0; k < geneKeySchedKeys.length; k++) {
                let geneKeySchedKey: any = geneKeySchedKeys[k];
                console.log(geneKeySchedKey);

                console.log(section[geneKeySchedKey]);
            }
        }
    }
};

const getCoursesFromCurriculum = (courses: string[]) => {
    let genedCourses = [];
    let majorCourses = [];

    for (let i = 0; i < courses.length; i++) {
        if (
            courses[i].startsWith('CS') ||
            courses[i].startsWith('IS') ||
            courses[i].startsWith('IT') ||
            courses[i].startsWith('ICS') ||
            courses[i].startsWith('C-') ||
            courses[i].startsWith('G-') ||
            courses[i].startsWith('D-')
        ) {
            majorCourses.push(courses[i]);
        } else {
            genedCourses.push(courses[i]);
        }
    }

    return {
        gened: genedCourses,
        major: majorCourses
    };
};

const removeFromGenedCoursesCompleteUnits = ({
    subjectCode,
    genedCourses
}: {
    subjectCode: string;
    genedCourses: string[];
}) => {
    return genedCourses.filter(course => course !== subjectCode);
};

const removeFromMajorCoursesCompleteUnits = ({
    subjectCode,
    majorCourses
}: {
    subjectCode: string;
    majorCourses: string[];
}) => {
    return majorCourses.filter(course => course !== subjectCode);
};

const checkNumberOfAssignedDays = (schedule: any) => {
    let assignedDays = 0;
    for (let i = 0; i < SCHOOL_DAYS.length; i++) {
        if (schedule[SCHOOL_DAYS[i]].length > 0) {
            assignedDays++;
        }
    }

    return assignedDays;
};

const findCourseInSchedule = ({
    subject_code,
    schedule
}: {
    subject_code: string;
    schedule: any;
}) => {
    let generalSubjectCode = subject_code.split('-')[0]; // ICS26001-LC - gets the ICS26001 part

    for (let i = 0; i < SCHOOL_DAYS.length; i++) {
        for (let j = 0; j < schedule[SCHOOL_DAYS[i]].length; j++) {
            let schedBlock = schedule[SCHOOL_DAYS[i]][j];
            let courseGeneralSubjectCode =
                schedBlock.course.subject_code.split('-')[0]; // ICS26001-LC - gets the ICS26001 part
            if (courseGeneralSubjectCode === generalSubjectCode) {
                return schedBlock;
            }
        }
    }
    return null;
};

const generateSectionNames = ({
    year,
    dept,
    sectionNumber
}: {
    year: any;
    dept: any;
    sectionNumber: any;
}) => {
    let sectionNames = [];
    for (let i = 0; i < sectionNumber; i++) {
        let secName = `${dept}_${year}${String.fromCharCode(65 + i)}`;
        sectionNames.push(secName.toLowerCase());
    }
    return sectionNames;
};

const checkIfUnitsComplete = async ({
    weeklyCourseUnits,
    courses
}: {
    weeklyCourseUnits: any;
    courses: any;
}) => {
    let query =
        'SELECT subject_code, total_units FROM courses WHERE subject_code = ANY($1)';
    const res = await client.query(query, [courses]);
    const courseTotalUnits = res.rows;

    for (let i = 0; i < courseTotalUnits.length; i++) {
        let units =
            weeklyCourseUnits[courseTotalUnits[i].subject_code]?.units || 0;
        if (units < courseTotalUnits[i].total_units) {
            return false;
        }
    }
    return true;
};

const getCourseDetails = async (course: string) => {
    const query = 'SELECT * FROM courses WHERE subject_code = $1 LIMIT 1';
    const res = await client.query(query, [course]);
    return res.rows[0];
};

const getProfFromCourse = async ({
    courseDetails,
    weeklyProfTimeBlocks,
    weeklyProfUnits,
    dept,
    schoolDay,
    timeBlock
}: {
    courseDetails: any;
    weeklyProfTimeBlocks: any;
    weeklyProfUnits: any;
    dept: string;
    schoolDay: any;
    timeBlock: any;
}) => {
    // ung main dep lng muna kunin

    const query =
        'SELECT * FROM teaching_academic_staff WHERE $1 = ANY(courses) AND main_department = $2';
    const res = await client.query(query, [courseDetails.subject_code, dept]);

    const mainAvailableProfs = res.rows;

    console.log(mainAvailableProfs);

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
        if (tries >= 50) {
            break loop1;
        }

        if (!prof || !prof?.tas_id) {
            continue loop1;
        }

        // check if pwede pa by getting the time slots of the prof from the constraint and if nag ooverlap not na siya pwede
        let profConstraints = weeklyProfTimeBlocks[prof.tas_id]
            ? weeklyProfTimeBlocks[prof.tas_id][schoolDay]
            : [];
        if (!isTimeBlockValid({ constraints: profConstraints, timeBlock })) {
            continue loop1;
        }

        // check if pwede pa from the course units
        let assignedUnits = weeklyProfUnits[prof.tas_id]?.units || 0;
        if (assignedUnits >= prof.units) {
            continue loop1;
        }

        // return ung prof na un
        return prof;
    }

    // pag wala sa main dep kuha sa iba except ung main dep para di maulit
    const query2 =
        'SELECT * FROM teaching_academic_staff WHERE $1 = ANY(courses) AND main_department != $2';
    const res2 = await client.query(query2, [courseDetails.subject_code, dept]);

    // console.log('kuha sub prof');

    const subAvailableProfs = res2.rows;

    let profAssigned2 = false;
    let tries2 = 0;
    // Try to assign a valid course for the current day

    if (subAvailableProfs.length < 0) {
        return null;
    }

    loop2: while (!profAssigned2) {
        // pick random don
        let prof =
            subAvailableProfs[
                Math.floor(Math.random() * subAvailableProfs.length)
            ];
        tries2++;

        if (tries2 >= 30) {
            // wala n tlga beh
            break loop2;
        }

        if (!prof || !prof?.tas_id) {
            continue loop2;
        }

        // check if pwede pa from the course units
        let profConstraints = weeklyProfTimeBlocks[prof.tas_id]
            ? weeklyProfTimeBlocks[prof.tas_id][schoolDay]
            : [];
        if (!isTimeBlockValid({ constraints: profConstraints, timeBlock })) {
            continue loop2;
        }

        let assignedUnits = weeklyProfUnits[prof.tas_id]?.units || 0;
        if (assignedUnits >= prof.units) {
            continue loop2;
        }

        // return ung prof na un
        return prof;
    }

    return null;
};

const isTimeBlockValid = ({
    constraints,
    timeBlock
}: {
    constraints: any;
    timeBlock: any;
}) => {
    if (constraints.length > 0) {
        return !constraints.some(
            (constraint: any) =>
                timeBlock.start < constraint.end &&
                timeBlock.end > constraint.start
        );
    } else {
        return true;
    }
};

const getRoomFromCourse = async ({
    courseDetails,
    weeklyRoomUnits,
    dept,
    schoolDay,
    timeBlock
}: {
    courseDetails: any;
    weeklyRoomUnits: any;
    dept: string;
    schoolDay: any;
    timeBlock: any;
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

        if (!room || !room?.room_id) {
            continue loop1;
        }

        // check if pwede pa from the course units
        let roomConstraints = weeklyRoomUnits[room.room_id]
            ? weeklyRoomUnits[room.room_id][schoolDay]
            : [];
        if (!isTimeBlockValid({ constraints: roomConstraints, timeBlock })) {
            continue loop1;
        }
        // let assignedUnits = weeklyRoomUnits[room.room_id]?.units || 0;
        // if (assignedUnits >= 14) {
        //     //HARD CODED PA UNG MAX UNITS NG ISANG ROOM
        //     continue;
        // }

        return room;
    }

    // // pag wala sa type na un check sa same dept pero different type naman
    const query2 =
        'SELECT * FROM rooms WHERE main_department = $1 AND type != $2';
    const res2 = await client.query(query2, [dept, courseDetails.type]);

    const mainAvailableRoomsDiffType = res2.rows;

    let roomAssigned2 = false;
    let tries2 = 0;

    loop1: while (!roomAssigned2) {
        // pick random don
        let room =
            mainAvailableRoomsDiffType[
                Math.floor(Math.random() * mainAvailableRoomsDiffType.length)
            ];
        tries2++;

        // wala n tlga beh
        if (tries2 >= 10) {
            break loop1;
        }

        if (!room || !room?.room_id) {
            continue loop1;
        }

        // check if pwede pa from the course units
        let roomConstraints = weeklyRoomUnits[room.room_id]
            ? weeklyRoomUnits[room.room_id][schoolDay]
            : [];
        if (!isTimeBlockValid({ constraints: roomConstraints, timeBlock })) {
            continue loop1;
        }

        return room;
    }

    // pag wala sa main dep kuha sa iba except ung main dep para di maulit
    const query3 = 'SELECT * FROM rooms WHERE main_department != $1';
    const res3 = await client.query(query3, [dept]);

    const subAvailableRooms = res3.rows;

    if (subAvailableRooms.length < 0) {
        return null;
    }

    let roomAssigned3 = false;
    let tries3 = 0;
    // Try to assign a valid course for the current day
    loop2: while (!roomAssigned3) {
        // pick random don
        let room =
            subAvailableRooms[
                Math.floor(Math.random() * subAvailableRooms.length)
            ];
        tries3++;

        if (tries3 >= 10) {
            // wala n tlga beh
            break loop2;
        }

        if (!room || !room?.room_id) {
            continue loop2;
        }

        // check if pwede pa from the course units
        let roomConstraints = weeklyRoomUnits[room.room_id]
            ? weeklyRoomUnits[room.room_id][schoolDay]
            : [];
        if (!isTimeBlockValid({ constraints: roomConstraints, timeBlock })) {
            continue loop2;
        }

        return room;
    }

    return null;
};

const checkAssignableTimeRanges = ({
    courseDetails,
    yearLevelTimeConstraints,
    weeklyTimeBlockConstraints,
    schoolDay
}: {
    courseDetails: any;
    yearLevelTimeConstraints: any;
    weeklyTimeBlockConstraints: any;
    schoolDay: string;
}) => {

    let assignableRanges = [];

    let availableRanges = getPossibleTimeRanges({
        yearLevelTimeConstraints,
        weeklyTimeBlockConstraints,
        courseConstraints: courseDetails.restrictions,
        schoolDay
    });

    for (let i = 0; i < availableRanges.length; i++){
        let timeDuration = timeToMinutes(availableRanges[i].end) - timeToMinutes(availableRanges[i].start)

        if (timeDuration >= 90){
            assignableRanges.push(availableRanges[i])
        }
    }

    return assignableRanges;
}

const getTimeBlockFromCourse = ({
    assignableTimeRanges,
    courseDetails
}: {
    assignableTimeRanges: {
        start: string;
        end: string;
    }[],
    courseDetails: any
}) => {
    let availableRanges = assignableTimeRanges;

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
                if (courseDetails.type === 'lab') {
                    if (
                        courseDetails.units_per_class * 3 * 60 >
                        availableMinutes
                    ) {
                        // console.log('oops sobra');
                        continue loop1;
                    }
                } else {
                    if (courseDetails.units_per_class * 60 > availableMinutes) {
                        // console.log('oops sobra');
                        continue loop1;
                    }
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
                // pag lab 1 unit is 3 hours
                if (courseDetails.type === 'lab') {
                    return {
                        timeBlock: {
                            start: randomStart,
                            end: minutesToTime(
                                timeToMinutes(randomStart) +
                                    courseDetails.units_per_class * 3 * 60
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
    yearLevelTimeConstraints,
    weeklyTimeBlockConstraints,
    courseConstraints,
    schoolDay
}: {
    yearLevelTimeConstraints: any;
    weeklyTimeBlockConstraints: any;
    courseConstraints: any;
    schoolDay: string;
}) => {
    const defaultRange = { start: '0700', end: '2100' };
    const constraints = [
        ...yearLevelTimeConstraints[schoolDay],
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
