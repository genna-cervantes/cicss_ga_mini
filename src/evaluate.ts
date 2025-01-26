import { Client } from 'pg';
import { chromosome } from './data';
import { SCHOOL_DAYS } from './constants';

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

// check if complete ung assignment based sa curriculum
const evaluateCoursesAssignment = async ({
    semester,
    chromosome
}: {
    semester: number;
    chromosome: any;
}) => {
    let violationCount = 0;
    let violations: any = [];

    const queryCS =
        "SELECT courses FROM curriculum WHERE semester = $1 AND department = 'CS' ORDER BY year";
    const res = await client.query(queryCS, [semester]);
    const curriculumCS = res.rows;

    const firstCSCurriculum = curriculumCS[0].courses;
    const secondCSCurriculum = curriculumCS[1].courses;
    const thirdCSCurriculum = curriculumCS[2].courses;
    const fourthCSCurriculum = curriculumCS[3].courses;

    const queryIT =
        "SELECT courses FROM curriculum WHERE semester = $1 AND department = 'IT' ORDER BY year";
    const resIT = await client.query(queryIT, [semester]);
    const curriculumIT = resIT.rows;

    const firstITCurriculum = curriculumIT[0].courses;
    // const secondITCurriculum = curriculumIT[1].courses;
    // const thirdITCurriculum = curriculumIT[2].courses;
    // const fourthITCurriculum = curriculumIT[3].courses;

    const queryIS =
        "SELECT courses FROM curriculum WHERE semester = $1 AND department = 'IS' ORDER BY year";
    const resIS = await client.query(queryIS, [semester]);
    const curriculumIS = resIS.rows;

    const firstISCurriculum = curriculumIS[0].courses;
    // const secondISCurriculum = curriculumIS[1].courses;
    // const thirdISCurriculum = curriculumIS[2].courses;
    // const fourthISCurriculum = curriculumIS[3].courses;

    // first year muna
    // loop thru the courses
    // query the total units
    // cross check with all units in weekly sched per 1st year section

    // cs 1st year
    for (let j = 0; j < chromosome[0].cs_1st.length; j++) {
        let section = chromosome[0].cs_1st[j];

        let totalUnitsPerSection = getTotalUnitsFromWeeklySchedule({
            sectionSchedule: section
        });

        for (let i = 0; i < firstCSCurriculum.length; i++) {
            const querySubj =
                'SELECT total_units, type FROM courses WHERE subject_code = $1';
            const res = await client.query(querySubj, [firstCSCurriculum[i]]);
            const totalUnits = res.rows[0].total_units;
            const subjectCode = firstCSCurriculum[i];

            if ((totalUnitsPerSection[subjectCode] ?? 0) < totalUnits) {
                violationCount++;
                violations.push({
                    course: subjectCode,
                    description: 'kulang units',
                    section: Object.keys(section)[0]
                });
            }
        }
    }

    // cs 2nd year
    for (let j = 0; j < chromosome[1].cs_2nd.length; j++) {
        let section = chromosome[1].cs_2nd[j];

        let totalUnitsPerSection = getTotalUnitsFromWeeklySchedule({
            sectionSchedule: section
        });

        for (let i = 0; i < secondCSCurriculum.length; i++) {
            const querySubj =
                'SELECT total_units, type FROM courses WHERE subject_code = $1';
            const res = await client.query(querySubj, [secondCSCurriculum[i]]);
            const totalUnits = res.rows[0].total_units;
            const subjectCode = secondCSCurriculum[i];

            if ((totalUnitsPerSection[subjectCode] ?? 0) < totalUnits) {
                violationCount++;
                violations.push({
                    course: subjectCode,
                    description: 'kulang units',
                    section: Object.keys(section)[0]
                });
            }
        }
    }

    // third year
    // fourth year

    // it
    for (let j = 0; j < chromosome[2].it_1st.length; j++) {
        let section = chromosome[2].it_1st[j];

        let totalUnitsPerSection = getTotalUnitsFromWeeklySchedule({
            sectionSchedule: section
        });

        for (let i = 0; i < firstITCurriculum.length; i++) {
            const querySubj =
                'SELECT total_units, type FROM courses WHERE subject_code = $1';
            const res = await client.query(querySubj, [firstITCurriculum[i]]);
            const totalUnits = res.rows[0].total_units;
            const subjectCode = firstITCurriculum[i];

            if ((totalUnitsPerSection[subjectCode] ?? 0) < totalUnits) {
                violationCount++;
                violations.push({
                    course: subjectCode,
                    description: 'kulang units',
                    section: Object.keys(section)[0]
                });
            }
        }
    }

    // 2nd
    // 3rd
    // 4th

    // is
    for (let j = 0; j < chromosome[3].is_1st.length; j++) {
        let section = chromosome[3].is_1st[j];

        let totalUnitsPerSection = getTotalUnitsFromWeeklySchedule({
            sectionSchedule: section
        });

        for (let i = 0; i < firstISCurriculum.length; i++) {
            const querySubj =
                'SELECT total_units, type FROM courses WHERE subject_code = $1';
            const res = await client.query(querySubj, [firstISCurriculum[i]]);
            const totalUnits = res.rows[0].total_units;
            const subjectCode = firstISCurriculum[i];

            if ((totalUnitsPerSection[subjectCode] ?? 0) < totalUnits) {
                violationCount++;
                violations.push({
                    course: subjectCode,
                    description: 'kulang units',
                    section: Object.keys(section)[0]
                });
            }
        }
    }

    // 2nd
    // 3rd
    // 4th

    return violations;
};

// check if may conflicting assignment ba sa rooms // 1903
const evaluateRoomAssignment = (chromosome: any) => {
    let violationCount = 0;
    let violations = [];

    let schedByRoom = groupSchedByRoom(chromosome);

    let roomKeys = Object.keys(schedByRoom);

    for (let i = 0; i < roomKeys.length; i++) {
        let specRoomSched = schedByRoom[roomKeys[i]];

        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let specRoomSchedPerDay = specRoomSched[SCHOOL_DAYS[j]];

            // sort by ascending order tapos compare magkakasunod
            let ascendingSched = specRoomSchedPerDay.sort(
                (schedBlock1: any, schedBlock2: any) => {
                    return (
                        parseInt(schedBlock1.timeBlock.start, 10) -
                        parseInt(schedBlock2.timeBlock.start, 10)
                    );
                }
            );

            for (let k = 0; k < ascendingSched.length - 1; k++) {
                // check if may conflicting
                let schedBlock1 = ascendingSched[k];
                let schedBlock2 = ascendingSched[k + 1];

                if (schedBlock2.timeBlock.start <= schedBlock1.timeBlock.end) {
                    violationCount++;
                    violations.push({
                        type: 'conflicting room assignment',
                        room: roomKeys[i],
                        courses: [
                            schedBlock1.course.subject_code,
                            schedBlock2.course.subject_code
                        ],
                        time: {
                            day: SCHOOL_DAYS[j],
                            time: schedBlock2.timeBlock.start
                        },
                        sections: [schedBlock1.section, schedBlock2.section]
                    });
                }
            }
        }
    }

    return violations;
};

const evaluateRoomTypeAssignment = (chromosome: any) => {

    let violationCount = 0;
    let violations = [];

    for (let i = 0; i < chromosome.length; i++) {
        let perYear = chromosome[i];
        let yearAndDepartmentKey = Object.keys(perYear)[0];
        let yearAndDepartmentSchedule = perYear[yearAndDepartmentKey];

        for (let j = 0; j < yearAndDepartmentSchedule.length; j++) {
            let specSection = yearAndDepartmentSchedule[j];
            let specSectionKey = Object.keys(specSection)[0];
            let specSectionSchedule = specSection[specSectionKey];

            for (let k = 0; k < SCHOOL_DAYS.length; k++) {
                let dailySched = specSectionSchedule[SCHOOL_DAYS[k]]

                for (let l = 0; l < dailySched.length; l++){

                    if (dailySched[l].course.subject_code.startsWith('PATHFIT')){
                        continue;
                    }

                    // check course per sched block
                    if (dailySched[l].course.type !== dailySched[l].room.type){
                        
                        if (!dailySched[l].course.subject_code.includes('CSELEC')){
                            violationCount++;
                            violations.push({
                                course: dailySched[l].course.subject_code,
                                section: specSectionKey,
                                type: 'room type assignment',
                                description: 'lec course assigned to lab and vice versa',
                                time: {
                                    day: SCHOOL_DAYS[k],
                                    time: dailySched[l].timeBlock
                                },
                                room: dailySched[l].room.room_id
                            })

                        }
                    }

                    // check specific room constraint (IT)
                }
            }
        }
    }

    return violations;
};

// helper functions
const groupSchedByRoom = (chromosome: any) => {
    // group schedule by room
    let schedByRoom;

    // loop per room per day
    for (let i = 0; i < chromosome.length; i++) {
        let perYear = chromosome[i];

        let yearAndDepartmentKey = Object.keys(perYear)[0];

        let yearAndDepartmentSchedule = perYear[yearAndDepartmentKey];
        for (let j = 0; j < yearAndDepartmentSchedule.length; j++) {
            let specSection = yearAndDepartmentSchedule[j];
            let specSectionKey = Object.keys(specSection)[0];
            let specSectionSchedule = specSection[specSectionKey];

            for (let k = 0; k < SCHOOL_DAYS.length; k++) {
                let daySched = specSectionSchedule[SCHOOL_DAYS[k]];

                let schedByRoomPerSectionPerDay = daySched.reduce(
                    (accumulator: any, schedBlock: any) => {
                        let room = schedBlock.room.room_id;

                        if (room === 'PE ROOM') {
                            return accumulator;
                        }

                        if (!accumulator[room]) {
                            accumulator[room] = {
                                M: [],
                                T: [],
                                W: [],
                                TH: [],
                                F: [],
                                S: []
                            };
                        }
                        accumulator[room][SCHOOL_DAYS[k]].push({
                            ...schedBlock,
                            section: specSectionKey
                        });
                        return accumulator;
                    },
                    {}
                );

                schedByRoom = mergeObjects({
                    obj1: schedByRoom,
                    obj2: schedByRoomPerSectionPerDay
                });
            }
        }
    }

    return schedByRoom;
};

const getTotalUnitsFromWeeklySchedule = ({
    sectionSchedule
}: {
    sectionSchedule: any;
}) => {
    // loop thru the week and add na the units
    // may obj nlng to store lahat ng units

    const totalUnitsPerCourse: any = {};

    const keys = Object.keys(sectionSchedule);
    const sectionName = keys[0];
    const schedule = sectionSchedule[sectionName];

    for (let i = 0; i < SCHOOL_DAYS.length; i++) {
        for (let j = 0; j < schedule[SCHOOL_DAYS[i]].length; j++) {
            if (
                totalUnitsPerCourse[
                    schedule[SCHOOL_DAYS[i]][j].course.subject_code
                ] !== undefined
            ) {
                totalUnitsPerCourse[
                    schedule[SCHOOL_DAYS[i]][j].course.subject_code
                ] += schedule[SCHOOL_DAYS[i]][j].course.units;
            } else {
                totalUnitsPerCourse[
                    schedule[SCHOOL_DAYS[i]][j].course.subject_code
                ] = schedule[SCHOOL_DAYS[i]][j].course.units;
            }
        }
    }

    return totalUnitsPerCourse;
};

const mergeObjects = ({ obj1, obj2 }: { obj1: any; obj2: any }) => {
    let result: any = { ...obj1 };

    for (let key in obj2) {
        if (result[key]) {
            result[key] = mergeObjects2({ obj1: result[key], obj2: obj2[key] });
        } else {
            result[key] = obj2[key];
        }
    }

    return result;
};

const mergeObjects2 = ({ obj1, obj2 }: { obj1: any; obj2: any }) => {
    let result: any = { ...obj1 };

    for (let key in obj2) {
        if (result[key]) {
            result[key] = [...result[key], ...obj2[key]];
        } else {
            result[key] = obj2[key];
        }
    }

    return result;
};

export const evaluate = async () => {
    // let violations = await evaluateCoursesAssignment({ semester: 2, chromosome: chromosome });

    // let violations = evaluateRoomAssignment(chromosome);

    let violations = evaluateRoomTypeAssignment(chromosome);

    return violations;
    // return true;
};
