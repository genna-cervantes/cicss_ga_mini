import { Client } from 'pg';
import { chromosome } from './data';
import {
    HARD_CONSTRAINT_WEIGHT,
    MEDIUM_CONSTRAINT_WEIGHT,
    SCHOOL_DAYS,
    SOFT_CONSTRAINT_WEIGHT
} from './constants';

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
export const evaluateCoursesAssignment = async ({
    semester,
    chromosome
}: {
    semester: number;
    chromosome: any;
}) => {
    let violationCount = 0;
    let violations: any = [];

    let curriculum: any = { CS: [], IT: [], IS: [] };

    const queryCS =
        "SELECT year, courses FROM curriculum WHERE semester = $1 AND department = 'CS' ORDER BY year";
    const res = await client.query(queryCS, [semester]);
    const curriculumCS = res.rows;

    const queryIT =
        "SELECT year, courses FROM curriculum WHERE semester = $1 AND department = 'IT' ORDER BY year";
    const resIT = await client.query(queryIT, [semester]);
    const curriculumIT = resIT.rows;

    const queryIS =
        "SELECT year, courses FROM curriculum WHERE semester = $1 AND department = 'IS' ORDER BY year";
    const resIS = await client.query(queryIS, [semester]);
    const curriculumIS = resIS.rows;

    for (let i = 0; i < curriculumCS.length; i++) {
        curriculum['CS'][curriculumCS[i].year] = curriculumCS[i].courses;
    }

    for (let i = 0; i < curriculumIT.length; i++) {
        curriculum['IT'][curriculumIT[i].year] = curriculumIT[i].courses;
    }

    for (let i = 0; i < curriculumIS.length; i++) {
        curriculum['IS'][curriculumIS[i].year] = curriculumIS[i].courses;
    }

    // // loop thru the sectins
    // // get the section
    // // get total units per section
    // // get the curriculum for that section
    // // loop thru curriculum

    for (let i = 0; i < chromosome.length; i++) {
        let perYear = chromosome[i];
        let yearAndDepartmentKey = Object.keys(perYear)[0];
        let yearAndDepartmentSchedule = perYear[yearAndDepartmentKey];

        let department = yearAndDepartmentKey.split('_')[0].toUpperCase();
        let year = yearAndDepartmentKey.split('_')[1].slice(0, 1);

        let requiredUnits = curriculum[department][year];

        for (let j = 0; j < yearAndDepartmentSchedule.length; j++) {
            let specSection = yearAndDepartmentSchedule[j];
            let specSectionKey = Object.keys(specSection)[0];
            let specSectionSchedule = specSection[specSectionKey];

            let totalUnitsPerSection = getTotalUnitsFromWeeklySchedule({
                sectionSchedule: specSectionSchedule
            });

            for (let k = 0; k < requiredUnits.length; k++) {
                const subjectCode = requiredUnits[k];
                const querySubj =
                    'SELECT total_units, type, units_per_class FROM courses WHERE subject_code = $1';
                const res = await client.query(querySubj, [subjectCode]);
                const unitsPerClass = res.rows[0].units_per_class;
                const type = res.rows[0].type;
                const totalUnits = res.rows[0].total_units;

                if ((totalUnitsPerSection[subjectCode] ?? 0) < totalUnits) {

                    violationCount++;
                    violations.push({
                        course: subjectCode,
                        course_type: type,
                        missing_units_per_class: unitsPerClass,
                        missing_class: (totalUnits - (totalUnitsPerSection[subjectCode] ?? 0))/unitsPerClass,
                        description: 'kulang units',
                        section: specSectionKey
                    });
                }
            }
        }
    }

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
                let dailySched = specSectionSchedule[SCHOOL_DAYS[k]];

                for (let l = 0; l < dailySched.length; l++) {
                    if (
                        dailySched[l].course.subject_code.startsWith('PATHFIT')
                    ) {
                        continue;
                    }

                    // check course per sched block
                    if (dailySched[l].course.type !== dailySched[l].room.type) {
                        if (
                            !dailySched[l].course.subject_code.includes(
                                'CSELEC'
                            )
                        ) {
                            violationCount++;
                            violations.push({
                                course: dailySched[l].course.subject_code,
                                section: specSectionKey,
                                type: 'room type assignment',
                                description:
                                    'lec course assigned to lab and vice versa',
                                time: {
                                    day: SCHOOL_DAYS[k],
                                    time: dailySched[l].timeBlock
                                },
                                room: dailySched[l].room.room_id
                            });
                        }
                    }

                    // check specific room constraint (IT)
                    if (dailySched[l].course.specific_room_assignment !== '') {
                        if (
                            dailySched[l].course.specific_room_assignment !==
                            dailySched[l].room.room_id
                        ) {
                            violationCount++;
                            violations.push({
                                course: dailySched[l].course.subject_code,
                                section: specSectionKey,
                                type: 'room type assignment',
                                description:
                                    'specific room assignment not followed',
                                time: {
                                    day: SCHOOL_DAYS[k],
                                    time: dailySched[l].timeBlock
                                },
                                required_room:
                                    dailySched[l].course
                                        .specific_room_assignment,
                                room: dailySched[l].room.room_id
                            });
                        }
                    }
                }
            }
        }
    }

    return violations;
};

const evaluateTASAssignment = (chromosome: any) => {
    let violationCount = 0;
    let violations = [];

    let schedByTAS = groupSchedByTAS(chromosome);

    let roomKeys = Object.keys(schedByTAS);

    for (let i = 0; i < roomKeys.length; i++) {
        let specTASSched = schedByTAS[roomKeys[i]];

        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let specTASSchedPerDay = specTASSched[SCHOOL_DAYS[j]];

            // sort by ascending order tapos compare magkakasunod
            let ascendingSched = specTASSchedPerDay.sort(
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
                        type: 'conflicting TAS assignment',
                        TAS: schedBlock1.prof,
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

const evaluateTASSpecializationAssignment = async (chromosome: any) => {
    let violationCount = 0;
    let violations = [];

    let schedByProf = groupSchedByTAS(chromosome);
    let profKeys = Object.keys(schedByProf);

    for (let i = 0; i < profKeys.length; i++) {
        const query =
            'SELECT courses FROM teaching_academic_staff WHERE tas_id = $1';
        const res = await client.query(query, [profKeys[i]]);
        const courses = res.rows[0].courses;

        // loop thru all the assigned sa kanya -
        let specProfSched = schedByProf[profKeys[i]];
        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let dailySpecProfSched = specProfSched[SCHOOL_DAYS[j]];

            for (let k = 0; k < dailySpecProfSched.length; k++) {
                let schedBlock = dailySpecProfSched[k];

                if (!courses.includes(schedBlock.course.subject_code)) {
                    violationCount++;
                    violations.push({
                        type: 'TAS assignment not specialty',
                        TAS: schedBlock.prof,
                        courses: schedBlock.course.subject_code,
                        time: {
                            day: SCHOOL_DAYS[j],
                            time: schedBlock.timeBlock.start
                        },
                        sections: schedBlock.section
                    });
                }
            }
        }
    }

    return violations;
};

const evaluateTASUnitsAssignment = async (chromosome: any) => {
    let violationCount = 0;
    let violations = [];

    let schedByProf = groupSchedByTAS(chromosome);
    let profKeys = Object.keys(schedByProf);

    for (let i = 0; i < profKeys.length; i++) {
        const query =
            'SELECT units FROM teaching_academic_staff WHERE tas_id = $1';
        const res = await client.query(query, [profKeys[i]]);
        const maxUnits = res.rows[0].units;

        let totalWeeklyUnits = 0;

        // loop thru all the assigned sa kanya -
        let specProfSched = schedByProf[profKeys[i]];
        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let dailySpecProfSched = specProfSched[SCHOOL_DAYS[j]];

            for (let k = 0; k < dailySpecProfSched.length; k++) {
                let schedBlock = dailySpecProfSched[k];

                if (schedBlock.course.type === 'lec') {
                    totalWeeklyUnits += schedBlock.course.units;
                } else {
                    // lab
                    totalWeeklyUnits += schedBlock.course.units * 3;
                }
            }
        }

        if (totalWeeklyUnits > maxUnits) {
            violationCount++;
            violations.push({
                type: 'TAS assignment over max units',
                TAS: profKeys[i],
                assignedUnits: totalWeeklyUnits,
                maxUnits: maxUnits
            });
        }
    }

    return violations;
};

const evaluateMaxClassDayLength = (chromosome: any) => {
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
                let daySched = specSectionSchedule[SCHOOL_DAYS[k]];

                if (daySched.length <= 0) {
                    continue;
                }

                let ascendingSched = daySched.sort(
                    (schedBlock1: any, schedBlock2: any) => {
                        return (
                            parseInt(schedBlock1.timeBlock.start, 10) -
                            parseInt(schedBlock2.timeBlock.start, 10)
                        );
                    }
                );

                let dayStart = parseInt(ascendingSched[0].timeBlock.start);
                let dayEnd = parseInt(
                    ascendingSched[ascendingSched.length - 1].timeBlock.end
                );

                if (dayEnd - dayStart > 800) {
                    violationCount++;
                    violations.push({
                        type: 'Section assigned more than 8 hours in a day',
                        section: specSectionKey,
                        day: SCHOOL_DAYS[k],
                        assignedUnits: dayEnd - dayStart
                    });
                }
            }
        }
    }

    return violations;
};

const evaluateConsecutiveClassHoursPerSection = (chromosome: any) => {
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
                let daySched = specSectionSchedule[SCHOOL_DAYS[k]];

                // ascending order
                // check ung end and start if walang break tapos ayun ung iggroup
                // check ung length nung group

                // sort by ascending order tapos compare magkakasunod
                let ascendingSched = daySched.sort(
                    (schedBlock1: any, schedBlock2: any) => {
                        return (
                            parseInt(schedBlock1.timeBlock.start, 10) -
                            parseInt(schedBlock2.timeBlock.start, 10)
                        );
                    }
                );

                let hours = 0;
                for (let l = 0; l < ascendingSched.length - 1; l++) {
                    if (ascendingSched[l].course.type === 'lec') {
                        hours += ascendingSched[l].course.units;
                    } else {
                        hours += ascendingSched[l].course.units * 3;
                    }

                    if (hours > 3) {
                        violationCount++;
                        violations.push({
                            type: 'Section assigned more than 3 consecutive hours of class',
                            section: specSectionKey,
                            day: SCHOOL_DAYS[k],
                            courses: [ascendingSched[l].course.subject_code],
                            time: ascendingSched[l].timeBlock.start
                        });
                    }

                    if (
                        ascendingSched[l].timeBlock.end <
                        ascendingSched[l + 1].timeBlock.start
                    ) {
                        hours = 0;
                    }
                }
            }
        }
    }

    return violations;
};

const evaluateGenedCoursesAssignment = async (chromosome: any) => {
    // get all gened courses and their constraints
    // loop thru each schedule and check if gened ung course
    // find ung constraint na un
    // cross check sa constraints if pasok b
    // add sa violation if ndi

    let violationCount = 0;
    let violations = [];

    const genedCoursesAndConstraints: any = {};

    const getGenedConstraintsQuery =
        "SELECT subject_code, restrictions FROM courses WHERE category = 'gened'";
    const res = await client.query(getGenedConstraintsQuery);
    const genedCoursesAndConstraintsRes = res.rows;

    genedCoursesAndConstraintsRes.forEach((ge: any) => {
        genedCoursesAndConstraints[ge.subject_code] = ge.restrictions;
    });

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

                for (let l = 0; l < daySched.length; l++) {
                    let schedBlock = daySched[l];

                    if (schedBlock.course.category !== 'gened') {
                        continue;
                    }

                    let constraints =
                        genedCoursesAndConstraints[
                            schedBlock.course.subject_code
                        ][SCHOOL_DAYS[k]];
                    for (let m = 0; m < constraints.length; m++) {
                        if (
                            parseInt(schedBlock.timeBlock.start) >
                                parseInt(constraints[m].start) &&
                            parseInt(schedBlock.timeBlock.end) <
                                parseInt(constraints[m].end)
                        ) {
                            violationCount++;
                            violations.push({
                                type: 'Gened course constraint not followed',
                                section: specSectionKey,
                                day: SCHOOL_DAYS[k],
                                courses: [schedBlock.course.subject_code],
                                time: schedBlock.timeBlock.start
                            });
                        }
                    }
                    // check if within ung timeslot neto don sa constraint ng
                }
            }
        }
    }

    return violations;
};

const evaluateNumberOfCoursesAssignedInADay = (chromosome: any) => {
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
                let daySched = specSectionSchedule[SCHOOL_DAYS[k]];

                if (daySched.length === 1) {
                    violationCount++;
                    violations.push({
                        type: 'Gened course constraint not followed',
                        section: specSectionKey,
                        day: SCHOOL_DAYS[k],
                        courses: [daySched[0].course.subject_code]
                    });
                }
            }
        }
    }

    return violations;
};

const evaluateAllowedDaysPerYearLevel = async (chromosome: any) => {
    let violationCount = 0;
    let violations = [];

    const allowedDaysPerYearAndDepartment: any = {};
    const allowedDaysQuery =
        'SELECT department, year, available_days, max_days FROM year_day_restrictions';
    const res = await client.query(allowedDaysQuery);
    const allowedDays = res.rows;

    allowedDays.forEach((ad: any) => {
        if (
            !allowedDaysPerYearAndDepartment[ad.department] ||
            !allowedDaysPerYearAndDepartment[ad.department][ad.year]
        ) {
            allowedDaysPerYearAndDepartment[ad.department] = {
                ...allowedDaysPerYearAndDepartment[ad.department],
                [ad.year]: { available_days: [], max_days: 0 }
            };
        }

        allowedDaysPerYearAndDepartment[ad.department][ad.year][
            'available_days'
        ] = ad.available_days;
        allowedDaysPerYearAndDepartment[ad.department][ad.year]['max_days'] =
            ad.max_days;
    });

    // loop thru ung year levels tapos check per section if may violated b n section
    for (let i = 0; i < chromosome.length; i++) {
        let perYear = chromosome[i];
        let yearAndDepartmentKey = Object.keys(perYear)[0];
        let yearAndDepartmentSchedule = perYear[yearAndDepartmentKey];

        let departmentKey = yearAndDepartmentKey.split('_')[0].toUpperCase();
        let yearKey = yearAndDepartmentKey.split('_')[1].slice(0, 1);

        // defaullt
        let specAllowedDays = allowedDaysPerYearAndDepartment[departmentKey]
            ? allowedDaysPerYearAndDepartment[departmentKey][yearKey]
                ? allowedDaysPerYearAndDepartment[departmentKey][yearKey]
                : { available_days: SCHOOL_DAYS, max_days: 6 }
            : { available_days: SCHOOL_DAYS, max_days: 6 };

        for (let j = 0; j < yearAndDepartmentSchedule.length; j++) {
            let specSection = yearAndDepartmentSchedule[j];
            let specSectionKey = Object.keys(specSection)[0];
            let specSectionSchedule = specSection[specSectionKey];

            // allowedDaysPerYearAndDepartment[]

            let assignedDays = 0;
            for (let k = 0; k < SCHOOL_DAYS.length; k++) {
                let daySched = specSectionSchedule[SCHOOL_DAYS[k]];

                if (daySched.length >= 1) {
                    assignedDays++;

                    if (
                        !specAllowedDays.available_days.includes(SCHOOL_DAYS[k])
                    ) {
                        violationCount++;
                        violations.push({
                            type: 'Course(s) assigned to restricted day',
                            section: specSectionKey,
                            day: SCHOOL_DAYS[k]
                        });
                    }
                }
            }

            if (assignedDays > specAllowedDays.max_days) {
                violationCount++;
                violations.push({
                    type: 'Year level assigned classes on more than the allowed days',
                    section: specSectionKey
                });
            }
        }
    }

    return violations;
};

const evaluateAllowedTimePerYearLevel = async (chromosome: any) => {
    let violationCount = 0;
    let violations = [];

    const allowedTimePerYearAndDepartment: any = {};
    const allowedTimeQuery =
        'SELECT department, year, restrictions FROM year_time_restrictions';
    const res = await client.query(allowedTimeQuery);
    const allowedTime = res.rows;

    allowedTime.forEach((ad: any) => {
        if (
            !allowedTimePerYearAndDepartment[ad.department] ||
            !allowedTimePerYearAndDepartment[ad.department][ad.year]
        ) {
            allowedTimePerYearAndDepartment[ad.department] = {
                ...allowedTimePerYearAndDepartment[ad.department],
                [ad.year]: { restrictions: [] }
            };
        }

        allowedTimePerYearAndDepartment[ad.department][ad.year][
            'restrictions'
        ] = ad.restrictions;
    });

    // loop thru ung year levels tapos check per section if may violated b n section
    for (let i = 0; i < chromosome.length; i++) {
        let perYear = chromosome[i];
        let yearAndDepartmentKey = Object.keys(perYear)[0];
        let yearAndDepartmentSchedule = perYear[yearAndDepartmentKey];

        let departmentKey = yearAndDepartmentKey.split('_')[0].toUpperCase();
        let yearKey = yearAndDepartmentKey.split('_')[1].slice(0, 1);

        // defaullt
        let specAllowedTime = allowedTimePerYearAndDepartment[departmentKey]
            ? allowedTimePerYearAndDepartment[departmentKey][yearKey]
                ? allowedTimePerYearAndDepartment[departmentKey][yearKey]
                : {
                      restrictions: {
                          F: [],
                          M: [],
                          S: [],
                          T: [],
                          W: [],
                          TH: []
                      }
                  }
            : {
                  restrictions: {
                      F: [],
                      M: [],
                      S: [],
                      T: [],
                      W: [],
                      TH: []
                  }
              };

        for (let j = 0; j < yearAndDepartmentSchedule.length; j++) {
            let specSection = yearAndDepartmentSchedule[j];
            let specSectionKey = Object.keys(specSection)[0];
            let specSectionSchedule = specSection[specSectionKey];

            for (let k = 0; k < SCHOOL_DAYS.length; k++) {
                let daySched = specSectionSchedule[SCHOOL_DAYS[k]];
                let constraints = specAllowedTime.restrictions[SCHOOL_DAYS[k]];

                for (let l = 0; l < daySched.length; l++) {
                    let schedBlock = daySched[l];

                    for (let m = 0; m < constraints.length; m++) {
                        if (
                            parseInt(schedBlock.timeBlock.start) >
                                parseInt(constraints[m].start) &&
                            parseInt(schedBlock.timeBlock.end) <
                                parseInt(constraints[m].end)
                        ) {
                            violationCount++;
                            violations.push({
                                type: 'Year level time constraint not followed',
                                section: specSectionKey,
                                day: SCHOOL_DAYS[k],
                                course: schedBlock.course.subject_code,
                                time: schedBlock.timeBlock.start
                            });
                        }
                    }
                }
            }
        }
    }

    return violations;
};

// atleast 2 days
const evaluateRestDays = (chromosome: any) => {
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

            let restDays = 1; // Sunday kasama
            for (let k = 0; k < SCHOOL_DAYS.length; k++) {
                let daySched = specSectionSchedule[SCHOOL_DAYS[k]];
                if (daySched.length <= 0) {
                    restDays++;
                }
            }

            if (restDays < 2) {
                violationCount++;
                violations.push({
                    type: 'Rest days less than ideal',
                    section: specSectionKey
                });
            }
        }
    }

    return violations;
};

const evaluateTASRequestAssignments = async (chromosome: any) => {
    let violationCount = 0;
    let violations = [];

    const TASRequests: any = {};

    const getTASRequestsQuery =
        'SELECT tas_id, restrictions FROM teaching_academic_staff';
    const res = await client.query(getTASRequestsQuery);
    const TASRequestsRes = res.rows;

    TASRequestsRes.forEach((tas: any) => {
        TASRequests[tas.tas_id] = tas.restrictions;
    });

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

                for (let l = 0; l < daySched.length; l++) {
                    let schedBlock = daySched[l];

                    if (schedBlock.course.category !== 'major') {
                        continue;
                    }

                    let constraints = TASRequests[schedBlock.prof.tas_id]
                        ? TASRequests[schedBlock.prof.tas_id][SCHOOL_DAYS[k]]
                        : [];

                    for (let m = 0; m < constraints.length; m++) {
                        if (
                            parseInt(schedBlock.timeBlock.start) >
                                parseInt(constraints[m].start) &&
                            parseInt(schedBlock.timeBlock.end) <
                                parseInt(constraints[m].end)
                        ) {
                            violationCount++;
                            violations.push({
                                type: 'TAS request not followed',
                                section: specSectionKey,
                                tas: schedBlock.prof.name,
                                day: SCHOOL_DAYS[k],
                                courses: [schedBlock.course.subject_code],
                                time: schedBlock.timeBlock.start
                            });
                        }
                    }
                    // check if within ung timeslot neto don sa constraint ng
                }
            }
        }
    }

    return violations;
};

const evaluateRoomProximity = (chromosome: any) => {
    let violationCount = 0;
    let violations: any = [];

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

                for (let l = 0; l < daySched.length - 1; l++) {
                    let schedBlock = daySched[l];
                    let nextSchedBlock = daySched[l + 1];

                    if (schedBlock.room.room_id === 'PE ROOM') {
                        continue;
                    }

                    let firstRoomFloor = Math.floor(
                        parseInt(schedBlock.room.room_id.slice(2)) / 100
                    );
                    let secondRoomFloor = Math.floor(
                        parseInt(nextSchedBlock.room.room_id.slice(2)) / 100
                    );

                    if (Math.abs(firstRoomFloor - secondRoomFloor) > 1) {
                        violationCount++;
                        violations.push({
                            type: 'Room proximity ideal not followed',
                            section: specSectionKey,
                            day: SCHOOL_DAYS[k],
                            courses: [
                                schedBlock.course.subject_code,
                                nextSchedBlock.course.subject_code
                            ],
                            time: [
                                schedBlock.timeBlock,
                                nextSchedBlock.timeBlock
                            ],
                            rooms: [
                                schedBlock.room.room_id,
                                nextSchedBlock.room.room_id
                            ]
                        });
                    }
                }
            }
        }
    }

    return violations;
};

// helper functions
const groupSchedByTAS = (chromosome: any) => {
    let schedByTAS;

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

                let schedByTASPerSectionPerDay = daySched.reduce(
                    (accumulator: any, schedBlock: any) => {
                        
                        let TAS = schedBlock.prof.tas_id;

                        if (TAS === 'GENDED PROF') {
                            return accumulator;
                        }

                        if (!accumulator[TAS]) {
                            accumulator[TAS] = {
                                M: [],
                                T: [],
                                W: [],
                                TH: [],
                                F: [],
                                S: []
                            };
                        }
                        accumulator[TAS][SCHOOL_DAYS[k]].push({
                            ...schedBlock,
                            section: specSectionKey
                        });
                        return accumulator;
                    },
                    {}
                );

                schedByTAS = mergeObjects({
                    obj1: schedByTAS,
                    obj2: schedByTASPerSectionPerDay
                });
            }
        }
    }

    return schedByTAS;
};

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
    const schedule = sectionSchedule;

    for (let i = 0; i < SCHOOL_DAYS.length; i++) {
        for (let j = 0; j < schedule[SCHOOL_DAYS[i]]?.length; j++) {
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

export const evaluateFast = async ({
    chromosome,
    semester
}: {
    chromosome: any;
    semester: number;
}) => {

    // violations
    let violationTracker: any = [];

    // define needed variables

    // course assignment
    let curriculum = await getCurriculumObject(semester);

    // allowedDaysPerYearAndDepartment
    let allowedDaysPerYearAndDepartment: any = await getAllowedDaysPerYearAndDepartment()

    for (let i = 0; i < chromosome.length; i++) {
        let perYear = chromosome[i];

        let yearAndDepartmentKey = Object.keys(perYear)[0];

        // course assignment
        let department = yearAndDepartmentKey.split('_')[0].toUpperCase();
        let year = parseInt(yearAndDepartmentKey.split('_')[1].slice(0, 1));

        // allowedDaysPerYearAndDepartment
        let specAllowedDays = allowedDaysPerYearAndDepartment[department]
        ? allowedDaysPerYearAndDepartment[department][year]
        ? allowedDaysPerYearAndDepartment[department][year]
        : { available_days: SCHOOL_DAYS, max_days: 6 }
        : { available_days: SCHOOL_DAYS, max_days: 6 };
        
        
        let yearAndDepartmentSchedule = perYear[yearAndDepartmentKey];
        for (let j = 0; j < yearAndDepartmentSchedule.length; j++) {
            let specSection = yearAndDepartmentSchedule[j];
            let specSectionKey = Object.keys(specSection)[0];
            let specSectionSchedule = specSection[specSectionKey];
            
            // course assignment
            let {
                violationCount: courseAssignmentViolationCount,
                violations: courseAssignmentViolations
            } = await evaluateCourseAssignmentFast({
                curriculum,
                department,
                year,
                specSectionSchedule,
                specSectionKey
            });
            
            violationTracker = addToViolationTracker({violationTracker, violationCount: courseAssignmentViolationCount, violations: courseAssignmentViolations, violationName: 'course_assignment'})
            
            
            // allowedDaysPerYearAndDepartment
            let assignedDays = 0
            for (let k = 0; k < SCHOOL_DAYS.length; k++) {
                let daySched = specSectionSchedule[SCHOOL_DAYS[k]];

                // room type assignment
                let {
                    violationCount: roomTypeAssignmentViolationCount,
                    violations: roomTypeAssignmentViolations
                } = evaluateRoomTypeAssignmentFast({dailySched: daySched, specSectionKey, schoolDay: SCHOOL_DAYS[k]})

                violationTracker = addToViolationTracker({violationTracker, violationCount: roomTypeAssignmentViolationCount, violations: roomTypeAssignmentViolations, violationName: 'room_type_assignment'})

                // max class length in day
                let {
                    violationCount: maxClassDayLengthViolationCount,
                    violations: maxClassDayLengthAssignmentViolations
                } = evaluateMaxClassDayLengthFast({daySched, specSectionKey, schoolDay: SCHOOL_DAYS[k]})

                violationTracker = addToViolationTracker({violationTracker, violationCount: maxClassDayLengthViolationCount, violations: maxClassDayLengthAssignmentViolations, violationName: 'max_class_day_length_assignment'})
                
                // max consecutive class hours
                let {
                    violationCount: consecutiveClassHoursPerSectionViolationCount,
                    violations: consecutiveClassHoursPerSectionViolations
                } = evaluateConsecutiveClassHoursPerSectionFast({daySched, specSectionKey, schoolDay: SCHOOL_DAYS[k]});
                
                violationTracker = addToViolationTracker({violationTracker, violationCount: consecutiveClassHoursPerSectionViolationCount, violations: consecutiveClassHoursPerSectionViolations, violationName: 'consecutive_class_hours'})
                
                // gened specific constraints
                let {
                    violationCount: genedCourseAssignmentViolationCount,
                    violations: genedCourseAssignmentViolations
                } = await evaluateFastGenedCourseAssignment({daySched, specSectionKey, schoolDay: SCHOOL_DAYS[k]});
                
                violationTracker = addToViolationTracker({violationTracker, violationCount: genedCourseAssignmentViolationCount, violations: genedCourseAssignmentViolations, violationName: 'gened_course_assignment'})
                
                // assigned classes in a day
                let {
                    violationCount: numberOfCoursesAssignedInADayViolationCount,
                    violations: numberOfCoursesAssignedInADayViolatins
                } = evaluateFastNumberOfCoursesAssignedInADay({daySched, specSectionKey, schoolDay: SCHOOL_DAYS[k]})
                
                violationTracker = addToViolationTracker({violationTracker, violationCount: numberOfCoursesAssignedInADayViolationCount, violations: numberOfCoursesAssignedInADayViolatins, violationName: 'courses_assigned_in_a_day'})
                
                // allowed specific days per year level
                let specificDaysReturn = evalFastAllowedSpecificDaysPerYearLevel({daySched, specAllowedDays, specSectionKey, schoolDay: SCHOOL_DAYS[k]});
                if (typeof specificDaysReturn !== 'number'){
                    violationTracker = addToViolationTracker({violationTracker, violationCount: specificDaysReturn.violationCount, violations: specificDaysReturn.violations, violationName: 'allowed_specific_days'})
                }else{
                    assignedDays += specificDaysReturn;
                }
                
            }

            // allowed number of days per year level
            let {
                violationCount: allowedNumberOfDaysPerYearLevelViolationCount,
                violations: allowedNumberOfDaysPerYearLevelViolations
            } = evalFastAllowedNumberOfDaysPerYearLevel({assignedDays, specAllowedDays, specSectionKey})
            
            violationTracker = addToViolationTracker({violationTracker, violationCount: allowedNumberOfDaysPerYearLevelViolationCount, violations: allowedNumberOfDaysPerYearLevelViolations, violationName: 'allowed_number_of_days'})
            
        }
    }

    // do here the other evaluations that are not applicable in the main loop

    return violationTracker;
};

const getAllowedDaysPerYearAndDepartment = async () => {

    const allowedDaysPerYearAndDepartment: any = {};
    const allowedDaysQuery =
        'SELECT department, year, available_days, max_days FROM year_day_restrictions';
    const res = await client.query(allowedDaysQuery);
    const allowedDays = res.rows;

    allowedDays.forEach((ad: any) => {
        if (
            !allowedDaysPerYearAndDepartment[ad.department] ||
            !allowedDaysPerYearAndDepartment[ad.department][ad.year]
        ) {
            allowedDaysPerYearAndDepartment[ad.department] = {
                ...allowedDaysPerYearAndDepartment[ad.department],
                [ad.year]: { available_days: [], max_days: 0 }
            };
        }

        allowedDaysPerYearAndDepartment[ad.department][ad.year][
            'available_days'
        ] = ad.available_days;
        allowedDaysPerYearAndDepartment[ad.department][ad.year]['max_days'] =
            ad.max_days;
    });

    return allowedDaysPerYearAndDepartment
}

const addToViolationTracker = ({violationTracker, violations, violationCount, violationName}: {violationTracker: any, violations: any, violationCount: number, violationName: string}) => {

    let localTracker = violationTracker ?? [];    

    if (violationCount > 0){
        // check if may ganon na na object, append nlng if meron na
        let violationTrackerObj = violationTracker.filter((v: any) => v.violation === violationName)[0];
        if (violationTrackerObj){
            violationTrackerObj.violationCount += violationCount
            violationTrackerObj.violations = [...violationTrackerObj.violations, ...violations]
        }else{
            localTracker.push({
                violation: violationName,
                violationCount: violationCount,
                violations: violations
            })
        }
    }

    return localTracker
}

export const evaluateCourseAssignmentFast = async ({
    curriculum,
    department,
    year,
    specSectionSchedule,
    specSectionKey
}: {
    curriculum: any;
    department: string;
    year: number;
    specSectionSchedule: any;
    specSectionKey: any;
}) => {
    let violationCount = 0;
    let violations: any = [];

    let requiredUnits = curriculum[department][year];

    let totalUnitsPerSection = getTotalUnitsFromWeeklySchedule({
        sectionSchedule: specSectionSchedule
    });

    for (let k = 0; k < requiredUnits.length; k++) {
        const subjectCode = requiredUnits[k];
        const querySubj =
            'SELECT total_units, type FROM courses WHERE subject_code = $1';
        const res = await client.query(querySubj, [subjectCode]);
        const totalUnits = res.rows[0].total_units;

        if ((totalUnitsPerSection[subjectCode] ?? 0) < totalUnits) {
            violationCount++;
            violations.push({
                course: subjectCode,
                description: 'kulang units',
                section: specSectionKey
            });
        }
    }

    return { violationCount, violations };
};

const evaluateRoomTypeAssignmentFast = ({dailySched, specSectionKey, schoolDay}: {dailySched: any, specSectionKey: string, schoolDay: string}) => {

    let violationCount = 0;
    let violations = [];

    for (let l = 0; l < dailySched.length; l++) {
        if (
            dailySched[l].course.subject_code.startsWith('PATHFIT')
        ) {
            continue;
        }

        // check course per sched block
        if (dailySched[l].course.type !== dailySched[l].room.type) {
            if (
                !dailySched[l].course.subject_code.includes(
                    'CSELEC'
                )
            ) {
                violationCount++;
                violations.push({
                    course: dailySched[l].course.subject_code,
                    section: specSectionKey,
                    type: 'room type assignment',
                    description:
                        'lec course assigned to lab and vice versa',
                    time: {
                        day: schoolDay,
                        time: dailySched[l].timeBlock
                    },
                    room: dailySched[l].room.room_id
                });
            }
        }

        // check specific room constraint (IT)
        if (dailySched[l].course.specific_room_assignment !== '') {
            if (
                dailySched[l].course.specific_room_assignment !==
                dailySched[l].room.room_id
            ) {
                violationCount++;
                violations.push({
                    course: dailySched[l].course.subject_code,
                    section: specSectionKey,
                    type: 'room type assignment',
                    description:
                        'specific room assignment not followed',
                    time: {
                        day: schoolDay,
                        time: dailySched[l].timeBlock
                    },
                    required_room:
                        dailySched[l].course
                            .specific_room_assignment,
                    room: dailySched[l].room.room_id
                });
            }
        }
    }

    return {
        violations,
        violationCount
    }
    
}

const evaluateMaxClassDayLengthFast = ({daySched, specSectionKey, schoolDay }: {daySched: any, specSectionKey: string, schoolDay: string}) => {

    let violationCount = 0;
    let violations: any = [];

    if (daySched.length <= 0) {
        return {
            violations,
            violationCount
        };
    }

    let ascendingSched = daySched.sort(
        (schedBlock1: any, schedBlock2: any) => {
            return (
                parseInt(schedBlock1.timeBlock.start, 10) -
                parseInt(schedBlock2.timeBlock.start, 10)
            );
        }
    );

    let dayStart = parseInt(ascendingSched[0].timeBlock.start);
    let dayEnd = parseInt(
        ascendingSched[ascendingSched.length - 1].timeBlock.end
    );

    if (dayEnd - dayStart > 800) {
        violationCount++;
        violations.push({
            type: 'Section assigned more than 8 hours in a day',
            section: specSectionKey,
            day: schoolDay,
            assignedUnits: dayEnd - dayStart
        });
    }

    return {
        violations,
        violationCount
    };
}

const evaluateConsecutiveClassHoursPerSectionFast = ({daySched, specSectionKey, schoolDay}: {daySched: any, specSectionKey: string, schoolDay: string}) => {
    let violationCount = 0;
    let violations = [];

    let ascendingSched = daySched.sort(
        (schedBlock1: any, schedBlock2: any) => {
            return (
                parseInt(schedBlock1.timeBlock.start, 10) -
                parseInt(schedBlock2.timeBlock.start, 10)
            );
        }
    );

    let hours = 0;
    for (let l = 0; l < ascendingSched.length - 1; l++) {
        if (ascendingSched[l].course.type === 'lec') {
            hours += ascendingSched[l].course.units;
        } else {
            hours += ascendingSched[l].course.units * 3;
        }

        if (hours > 3) {
            violationCount++;
            violations.push({
                type: 'Section assigned more than 3 consecutive hours of class',
                section: specSectionKey,
                day: schoolDay,
                courses: [ascendingSched[l].course.subject_code],
                time: ascendingSched[l].timeBlock.start
            });
        }

        if (
            ascendingSched[l].timeBlock.end <
            ascendingSched[l + 1].timeBlock.start
        ) {
            hours = 0;
        }
    }

    return {
        violationCount,
        violations
    }
}

const evaluateFastGenedCourseAssignment = async ({daySched, specSectionKey, schoolDay}: {daySched: any, specSectionKey: string, schoolDay: string}) => {

    let violationCount = 0;
    let violations = [];
    
    const genedCoursesAndConstraints: any = {};

    const getGenedConstraintsQuery =
        "SELECT subject_code, restrictions FROM courses WHERE category = 'gened'";
    const res = await client.query(getGenedConstraintsQuery);
    const genedCoursesAndConstraintsRes = res.rows;

    genedCoursesAndConstraintsRes.forEach((ge: any) => {
        genedCoursesAndConstraints[ge.subject_code] = ge.restrictions;
    });

    for (let l = 0; l < daySched.length; l++) {
        let schedBlock = daySched[l];

        if (schedBlock.course.category !== 'gened') {
            continue;
        }

        let constraints =
            genedCoursesAndConstraints[
                schedBlock.course.subject_code
            ][schoolDay];
        for (let m = 0; m < constraints.length; m++) {
            if (
                parseInt(schedBlock.timeBlock.start) >
                    parseInt(constraints[m].start) &&
                parseInt(schedBlock.timeBlock.end) <
                    parseInt(constraints[m].end)
            ) {
                violationCount++;
                violations.push({
                    type: 'Gened course constraint not followed',
                    section: specSectionKey,
                    day: schoolDay,
                    courses: [schedBlock.course.subject_code],
                    time: schedBlock.timeBlock.start
                });
            }
        }
        // check if within ung timeslot neto don sa constraint ng
    }

    return {
        violationCount,
        violations
    }
}

const evaluateFastNumberOfCoursesAssignedInADay = ({daySched, specSectionKey, schoolDay}: {daySched: any, specSectionKey: string, schoolDay: string}) => {

    let violationCount = 0;
    let violations = []

    if (daySched.length === 1) {
        violationCount++;
        violations.push({
            type: 'Gened course constraint not followed',
            section: specSectionKey,
            day: schoolDay,
            courses: [daySched[0].course.subject_code]
        });
    }

    return {
        violationCount,
        violations
    }
}

const evalFastAllowedSpecificDaysPerYearLevel = ({daySched, specAllowedDays, specSectionKey, schoolDay}: {daySched: any, specAllowedDays: any, specSectionKey: string, schoolDay: string}) => {
    let violationCount = 0;
    let violations = [];

    if (daySched.length >= 1) {

        if (
            !specAllowedDays.available_days.includes(schoolDay)
        ) {
            violationCount++;
            violations.push({
                type: 'Course(s) assigned to restricted day',
                section: specSectionKey,
                day: schoolDay
            });

            return {
                violationCount,
                violations
            }
        }

        return 1
    }
    return 0
}

const evalFastAllowedNumberOfDaysPerYearLevel = ({assignedDays, specAllowedDays, specSectionKey}: {assignedDays: number, specAllowedDays: any, specSectionKey: string}) => {
    let violationCount = 0;
    let violations = []

    if (assignedDays > specAllowedDays.max_days) {
        violationCount++;
        violations.push({
            type: 'Year level assigned classes on more than the allowed days',
            section: specSectionKey
        });
    }

    return {
        violationCount,
        violations
    }
}

const getCurriculumObject = async (semester: number) => {
    let curriculum: any = { CS: [], IT: [], IS: [] };

    const queryCS =
        "SELECT year, courses FROM curriculum WHERE semester = $1 AND department = 'CS' ORDER BY year";
    const res = await client.query(queryCS, [semester]);
    const curriculumCS = res.rows;

    const queryIT =
        "SELECT year, courses FROM curriculum WHERE semester = $1 AND department = 'IT' ORDER BY year";
    const resIT = await client.query(queryIT, [semester]);
    const curriculumIT = resIT.rows;

    const queryIS =
        "SELECT year, courses FROM curriculum WHERE semester = $1 AND department = 'IS' ORDER BY year";
    const resIS = await client.query(queryIS, [semester]);
    const curriculumIS = resIS.rows;

    for (let i = 0; i < curriculumCS.length; i++) {
        curriculum['CS'][curriculumCS[i].year] = curriculumCS[i].courses;
    }

    for (let i = 0; i < curriculumIT.length; i++) {
        curriculum['IT'][curriculumIT[i].year] = curriculumIT[i].courses;
    }

    for (let i = 0; i < curriculumIS.length; i++) {
        curriculum['IS'][curriculumIS[i].year] = curriculumIS[i].courses;
    }

    return curriculum;
};

export const evaluate = async (chromosome: any) => {
    let violations: any = [];
    let violationType: any = [];
    let violationCount = 0;
    let score = 100;

    let courseAssignmentViolations = await evaluateCoursesAssignment({
        semester: 2,
        chromosome: chromosome
    });
    violations = [...violations, ...courseAssignmentViolations];
    const courseAssignmentViolationsLength = courseAssignmentViolations.length;
    violationCount += courseAssignmentViolationsLength;
    violationType.push({
        violationType: 'course assignment violation',
        violationCount: courseAssignmentViolationsLength
    });
    score -= courseAssignmentViolationsLength * HARD_CONSTRAINT_WEIGHT;

    let roomAssignmentViolations = evaluateRoomAssignment(chromosome);
    const roomAssignmentViolationsLength = roomAssignmentViolations.length;
    violations = [...violations, ...roomAssignmentViolations];
    violationCount += roomAssignmentViolationsLength;
    violationType.push({
        violationType: 'room assignment violation',
        violationCount: roomAssignmentViolationsLength
    });
    score -= roomAssignmentViolationsLength * HARD_CONSTRAINT_WEIGHT;

    let roomTypeAssignmentViolations = evaluateRoomTypeAssignment(chromosome);
    const roomTypeAssignmentViolationsLength =
        roomTypeAssignmentViolations.length;
    violations = [...violations, ...roomTypeAssignmentViolations];
    violationCount += roomTypeAssignmentViolationsLength;
    violationType.push({
        violationType: 'room type assignment violation',
        violationCount: roomTypeAssignmentViolationsLength
    });
    score -= roomTypeAssignmentViolationsLength * HARD_CONSTRAINT_WEIGHT;

    let TASAssignmentViolations = evaluateTASAssignment(chromosome);
    const TASAssignmentViolationsLength = TASAssignmentViolations.length;
    violations = [...violations, ...TASAssignmentViolations];
    violationCount += TASAssignmentViolationsLength;
    violationType.push({
        violationType: 'tas assignment violation',
        violationCount: TASAssignmentViolationsLength
    });
    score -= TASAssignmentViolationsLength * HARD_CONSTRAINT_WEIGHT;

    let TASSpecializationAssignmentViolations =
        await evaluateTASSpecializationAssignment(chromosome);
    const TASSpecializationAssignmentViolationsLength =
        TASSpecializationAssignmentViolations.length;
    violations = [...violations, ...TASSpecializationAssignmentViolations];
    violationCount += TASSpecializationAssignmentViolationsLength;
    violationType.push({
        violationType: 'tas specialization assignment violation',
        violationCount: TASSpecializationAssignmentViolationsLength
    });
    score -=
        TASSpecializationAssignmentViolationsLength * HARD_CONSTRAINT_WEIGHT;

    let TASUnitsViolations = await evaluateTASUnitsAssignment(chromosome);
    const TASUnitsViolationsLength = TASUnitsViolations.length;
    violations = [...violations, ...TASUnitsViolations];
    violationCount += TASUnitsViolationsLength;
    violationType.push({
        violationType: 'tas units violation',
        violationCount: TASUnitsViolationsLength
    });
    score -= TASUnitsViolationsLength * HARD_CONSTRAINT_WEIGHT;

    let maxClassDayLengthViolations = evaluateMaxClassDayLength(chromosome);
    const maxClassDayLengthViolationsLength =
        maxClassDayLengthViolations.length;
    violations = [...violations, ...maxClassDayLengthViolations];
    violationCount += maxClassDayLengthViolationsLength;
    violationType.push({
        violationType: 'max class day length violation',
        violationCount: maxClassDayLengthViolationsLength
    });
    score -= maxClassDayLengthViolationsLength * HARD_CONSTRAINT_WEIGHT;

    let consecutiveClassHoursViolations =
        evaluateConsecutiveClassHoursPerSection(chromosome);
    const consecutiveClassHoursViolationsLength =
        consecutiveClassHoursViolations.length;
    violations = [...violations, ...consecutiveClassHoursViolations];
    violationCount += consecutiveClassHoursViolationsLength;
    violationType.push({
        violationType: 'consecutive class hours violation',
        violationCount: consecutiveClassHoursViolationsLength
    });
    score -= consecutiveClassHoursViolationsLength * HARD_CONSTRAINT_WEIGHT;

    let genedCourseAssignmentViolations =
        await evaluateGenedCoursesAssignment(chromosome);
    const genedCourseAssignmentViolationsLength =
        genedCourseAssignmentViolations.length;
    violations = [...violations, ...genedCourseAssignmentViolations];
    violationCount += genedCourseAssignmentViolationsLength;
    violationType.push({
        violationType: 'gened courses assignment violation',
        violationCount: genedCourseAssignmentViolationsLength
    });
    score -= genedCourseAssignmentViolationsLength * HARD_CONSTRAINT_WEIGHT;

    let numberOfCourseAssignedPerDayViolations =
        evaluateNumberOfCoursesAssignedInADay(chromosome);
    const numberOfCourseAssignedPerDayViolationsLength =
        numberOfCourseAssignedPerDayViolations.length;
    violations = [...violations, ...numberOfCourseAssignedPerDayViolations];
    violationCount += numberOfCourseAssignedPerDayViolationsLength;
    violationType.push({
        violationType: 'number of course assigned per day violation',
        violationCount: numberOfCourseAssignedPerDayViolationsLength
    });
    score -=
        numberOfCourseAssignedPerDayViolationsLength * HARD_CONSTRAINT_WEIGHT;

    let allowedDaysPerYearLevelViolations =
        await evaluateAllowedDaysPerYearLevel(chromosome);
    const allowedDaysPerYearLevelViolationsLength =
        allowedDaysPerYearLevelViolations.length;
    violations = [...violations, ...allowedDaysPerYearLevelViolations];
    violationCount += allowedDaysPerYearLevelViolationsLength;
    violationType.push({
        violationType: 'allowed days per year level violation',
        violationCount: allowedDaysPerYearLevelViolationsLength
    });
    score -= allowedDaysPerYearLevelViolationsLength * HARD_CONSTRAINT_WEIGHT;

    let allowedTimePerYearLevelViolations =
        await evaluateAllowedTimePerYearLevel(chromosome);
    const allowedTimePerYearLevelViolationsLength =
        allowedTimePerYearLevelViolations.length;
    violations = [...violations, ...allowedTimePerYearLevelViolations];
    violationCount += allowedTimePerYearLevelViolationsLength;
    violationType.push({
        violationType: 'allowed time per year level violation',
        violationCount: allowedTimePerYearLevelViolationsLength
    });
    score -= allowedTimePerYearLevelViolationsLength * HARD_CONSTRAINT_WEIGHT;

    let restDaysViolations = evaluateRestDays(chromosome);
    const restDaysViolationsLength = restDaysViolations.length;
    violations = [...violations, ...restDaysViolations];
    violationCount += restDaysViolationsLength;
    violationType.push({
        violationType: 'rest days violation',
        violationCount: restDaysViolationsLength
    });
    score -= restDaysViolationsLength * MEDIUM_CONSTRAINT_WEIGHT;

    let TASRequestsViolations = await evaluateTASRequestAssignments(chromosome);
    const TASRequestsViolationsLength = TASRequestsViolations.length;
    violations = [...violations, ...TASRequestsViolations];
    violationCount += TASRequestsViolationsLength;
    violationType.push({
        violationType: 'tas requests violation',
        violationCount: TASRequestsViolationsLength
    });
    score -= TASRequestsViolationsLength * SOFT_CONSTRAINT_WEIGHT;

    let roomProximityViolations = evaluateRoomProximity(chromosome);
    const roomProximityViolationsLength = roomProximityViolations.length;
    violations = [...violations, ...roomProximityViolations];
    violationCount += roomProximityViolationsLength;
    violationType.push({
        violationType: 'room proximity violation',
        violationCount: roomProximityViolationsLength
    });
    score -= roomProximityViolationsLength * SOFT_CONSTRAINT_WEIGHT;

    return { score, violationType };
    // return true;
};
