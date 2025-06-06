import { client } from './scriptV3';
import {
    HARD_CONSTRAINT_WEIGHT,
    MEDIUM_CONSTRAINT_WEIGHT,
    SCHOOL_DAYS,
    SOFT_CONSTRAINT_WEIGHT
} from '../constants';
import { chromosome } from '../data';
import { v4 as uuidv4 } from 'uuid';
import { getTotalUnitsFromWeeklySchedule } from '../v2/evaluate';

export const evaluateCoursesAssignment = async ({
    semester,
    classSchedule
}: {
    semester: number;
    classSchedule: any;
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

    let departmentKeys = Object.keys(classSchedule);
    for (let i = 0; i < departmentKeys.length; i++) {
        let departmentSched = classSchedule[departmentKeys[i]];

        let yearKeys = Object.keys(departmentSched);
        for (let j = 0; j < yearKeys.length; j++) {
            let yearSched = departmentSched[yearKeys[j]];

            let requiredUnits = curriculum[departmentKeys[i]][yearKeys[j]];

            let classKeys = Object.keys(yearSched);
            for (let k = 0; k < classKeys.length; k++) {
                let classSched = yearSched[classKeys[k]];

                let totalUnitsPerSection = getTotalUnitsFromWeeklySchedule({
                    sectionSchedule: classSched
                });

                for (let l = 0; l < requiredUnits.length; l++) {
                    const subjectCode = requiredUnits[l];
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
                            missing_class:
                                (totalUnits -
                                    (totalUnitsPerSection[subjectCode] ?? 0)) /
                                unitsPerClass,
                            description: 'kulang units',
                            section: classKeys[k]
                        });
                    }
                }
            }
        }
    }

    return { violations, violationCount };
};

export const evaluateTASSchedule = (TASSchedule: any) => {
    // loop thru
    // look for overlap
    let violations = [];
    let violationCount = 0;

    let profKeys = Object.keys(TASSchedule);
    for (let i = 0; i < profKeys.length; i++) {
        // loop thru all the assigned sa kanya -

        if (profKeys[i] === 'GENED PROF' || profKeys[i] === 'GENED_PROF') {
            continue;
        }

        let specProfSched = TASSchedule[profKeys[i]];
        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let dailySpecProfSched = specProfSched[SCHOOL_DAYS[j]];

            for (let k = 0; k < dailySpecProfSched.length - 1; k++) {
                let schedBlock = dailySpecProfSched[k];
                let nextSchedBlock = dailySpecProfSched[k + 1];

                if (
                    (parseInt(schedBlock.timeBlock.start) >=
                        parseInt(nextSchedBlock.timeBlock.start) &&
                        parseInt(schedBlock.timeBlock.start) <
                            parseInt(nextSchedBlock.timeBlock.end)) ||
                    (parseInt(schedBlock.timeBlock.end) >
                        parseInt(nextSchedBlock.timeBlock.start) &&
                        parseInt(schedBlock.timeBlock.end) <=
                            parseInt(nextSchedBlock.timeBlock.end)) ||
                    (parseInt(schedBlock.timeBlock.start) <=
                        parseInt(nextSchedBlock.timeBlock.start) &&
                        parseInt(schedBlock.timeBlock.end) >=
                            parseInt(nextSchedBlock.timeBlock.end)) ||
                    (parseInt(schedBlock.timeBlock.start) >=
                        parseInt(nextSchedBlock.timeBlock.start) &&
                        parseInt(schedBlock.timeBlock.end) <=
                            parseInt(nextSchedBlock.timeBlock.end))
                ) {
                    let specViolation = {
                        id: uuidv4(),
                        schedBlockId: schedBlock.id,
                        tas: profKeys[i],
                        course: {
                            current: schedBlock.course,
                            against: nextSchedBlock.course
                        },
                        section: {
                            current: `${schedBlock.year}${schedBlock.section}`,
                            against: `${nextSchedBlock.year}${nextSchedBlock.section}`
                        },
                        type: 'tas overlap',
                        description: 'tas assigned overlapping schedules',
                        time: {
                            day: SCHOOL_DAYS[j],
                            time: schedBlock.timeBlock
                        }
                        // room: schedBlock.room.roomId
                    };

                    violations.push(specViolation);
                    violationCount++;
                }
            }
        }
    }

    return {
        violationCount,
        violations
    };
};

export const evaluateRoomSchedule = (roomSchedule: any) => {
    // loop thru
    // look for overlap
    let violations = [];
    let violationCount = 0;

    let roomKeys = Object.keys(roomSchedule);
    for (let i = 0; i < roomKeys.length; i++) {
        // loop thru all the assigned sa kanya -

        if (roomKeys[i] === 'PE ROOM' || roomKeys[i] === 'PE_ROOM') {
            continue;
        }

        let specRoomSched = roomSchedule[roomKeys[i]];
        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let dailyRoomSchedule = specRoomSched[SCHOOL_DAYS[j]];

            // ascending
            let ascendingSched = dailyRoomSchedule.sort(
                (schedBlock1: any, schedBlock2: any) => {
                    return (
                        parseInt(schedBlock1.timeBlock.start, 10) -
                        parseInt(schedBlock2.timeBlock.start, 10)
                    );
                }
            );

            for (let k = 0; k < ascendingSched.length - 1; k++) {
                let schedBlock = ascendingSched[k];
                let nextSchedBlock = ascendingSched[k + 1];

                if (schedBlock.course === 'ICS2606-LB')
                    console.log(ascendingSched);
                if (schedBlock.id == 'fc72a5f4-4aa0-4174-9857-6f6bad7d47c1') {
                    console.log(schedBlock);
                    console.log(nextSchedBlock);
                }

                // 9 1130
                // 7 10
                if (
                    (parseInt(schedBlock.timeBlock.start) >=
                        parseInt(nextSchedBlock.timeBlock.start) &&
                        parseInt(schedBlock.timeBlock.start) <
                            parseInt(nextSchedBlock.timeBlock.end)) ||
                    (parseInt(schedBlock.timeBlock.end) >
                        parseInt(nextSchedBlock.timeBlock.start) &&
                        parseInt(schedBlock.timeBlock.end) <=
                            parseInt(nextSchedBlock.timeBlock.end)) ||
                    (parseInt(schedBlock.timeBlock.start) <=
                        parseInt(nextSchedBlock.timeBlock.start) &&
                        parseInt(schedBlock.timeBlock.end) >=
                            parseInt(nextSchedBlock.timeBlock.end)) ||
                    (parseInt(schedBlock.timeBlock.start) >=
                        parseInt(nextSchedBlock.timeBlock.start) &&
                        parseInt(schedBlock.timeBlock.end) <=
                            parseInt(nextSchedBlock.timeBlock.end))
                ) {
                    let specViolation = {
                        id: uuidv4(),
                        schedBlockId: schedBlock.id,
                        room: roomKeys[i],
                        tas: schedBlock.tas,
                        course: {
                            current: schedBlock.course,
                            against: nextSchedBlock.course
                        },
                        section: {
                            current: `${schedBlock.year}${schedBlock.section}`,
                            against: `${nextSchedBlock.year}${nextSchedBlock.section}`
                        },
                        type: 'room overlap',
                        description: 'room assigned overlapping schedules',
                        time: {
                            day: SCHOOL_DAYS[j],
                            time: schedBlock.timeBlock
                        }
                        // room: schedBlock.room.roomId
                    };

                    violations.push(specViolation);
                    violationCount++;
                }
            }
        }
    }

    return {
        violationCount,
        violations
    };
};

const evaluateRoomTypeAssignment = (
    classSchedule: any,
    structuredClassViolations: any,
    structuredTASViolations: any
) => {
    let violationCount = 0;
    let violations = [];

    let departmentKeys = Object.keys(classSchedule);
    for (let i = 0; i < departmentKeys.length; i++) {
        let departmentSched = classSchedule[departmentKeys[i]];

        let yearKeys = Object.keys(departmentSched);
        for (let j = 0; j < yearKeys.length; j++) {
            let yearSched = departmentSched[yearKeys[j]];

            let classKeys = Object.keys(yearSched);
            for (let k = 0; k < classKeys.length; k++) {
                let classSched = yearSched[classKeys[k]];

                for (let m = 0; m < SCHOOL_DAYS.length; m++) {
                    let daySched = classSched[SCHOOL_DAYS[m]];

                    if (!daySched) {
                        continue;
                    }

                    for (let n = 0; n < daySched.length; n++) {
                        let schedBlock = daySched[n];

                        if (
                            schedBlock.course.subjectCode.startsWith('PATHFIT')
                        ) {
                            continue;
                        }

                        if (schedBlock.room == null) {
                            continue;
                        }

                        // check course per sched block
                        if (schedBlock.course.type !== schedBlock.room.type) {
                            if (
                                !schedBlock.course.subjectCode.includes(
                                    'CSELEC'
                                )
                            ) {
                                let specViolation = {
                                    id: uuidv4(),
                                    schedBlockId: schedBlock.id,
                                    year: { current: yearKeys[j] },
                                    course: {
                                        current: schedBlock.course.subjectCode
                                    },
                                    section: {
                                        current: `${yearKeys[j]}${classKeys[k]}`
                                    },
                                    type: 'room type assignment',
                                    description:
                                        'lec course assigned to lab and vice versa',
                                    time: {
                                        day: SCHOOL_DAYS[m],
                                        time: schedBlock.timeBlock
                                    },
                                    room: schedBlock.room.room_id
                                };

                                violationCount++;

                                // class violations
                                if (
                                    !structuredClassViolations[
                                        departmentKeys[i]
                                    ]
                                ) {
                                    structuredClassViolations[
                                        departmentKeys[i]
                                    ] = {
                                        1: {},
                                        2: {},
                                        3: {},
                                        4: {}
                                    };
                                }
                                if (
                                    !structuredClassViolations[
                                        departmentKeys[i]
                                    ][yearKeys[j]][classKeys[k]]
                                ) {
                                    structuredClassViolations[
                                        departmentKeys[i]
                                    ][yearKeys[j]][classKeys[k]] = {
                                        perSchedBlock: [],
                                        perSection: []
                                    };
                                }
                                structuredClassViolations[departmentKeys[i]][
                                    yearKeys[j]
                                ][classKeys[k]]['perSchedBlock'].push(
                                    specViolation
                                );

                                // tas violations

                                if (
                                    !schedBlock.tas ||
                                    schedBlock.tas.tas_id == 'GENED_PROF'
                                ) {
                                    continue;
                                }

                                if (
                                    !structuredTASViolations[
                                        schedBlock.tas.tas_id
                                    ]
                                ) {
                                    structuredTASViolations[
                                        schedBlock.tas.tas_id
                                    ] = {
                                        perSchedBlock: [],
                                        perTAS: []
                                    };
                                }
                                structuredTASViolations[schedBlock.tas.tas_id][
                                    'perSchedBlock'
                                ].push(specViolation);

                                violations.push(specViolation);
                            }
                        }
                    }
                }
            }
        }
    }

    return {
        violationCount,
        violations
    };
};

// for prof
const evaluateTASUnits = async (
    TASSchedule: any,
    structuredTASViolations: any
) => {
    let violations: any = [];
    let violationCount = 0;

    let profKeys = Object.keys(TASSchedule);
    for (let i = 0; i < profKeys.length; i++) {
        let profSched = TASSchedule[profKeys[i]];
        let units = profSched['units'];

        const query =
            'SELECT units FROM teaching_academic_staff WHERE tas_id = $1';
        const res = await client.query(query, [profKeys[i]]);
        const maxUnits = res.rows[0].units;

        if (units > maxUnits) {
            let specViolation = {
                id: uuidv4(),
                tas: profKeys[i],
                type: 'tasUnits',
                description: 'tas assigned too many units'
            };

            violationCount++;

            // tas violations
            if (profKeys[i] === 'GENED_PROF') {
                continue;
            }

            if (!structuredTASViolations[profKeys[i]]) {
                structuredTASViolations[profKeys[i]] = {
                    perSchedBlock: [],
                    perTAS: []
                };
            }
            structuredTASViolations[profKeys[i]]['perTAS'].push(specViolation);

            violations.push(specViolation);
        }
    }

    return {
        violations,
        violationCount
    };
};

const evaluateTASSpecialty = async (
    TASSchedule: any,
    structuredClassViolations: any,
    structuredTASViolations: any
) => {
    let violations: any = [];
    let violationCount = 0;

    let profKeys = Object.keys(TASSchedule);
    for (let i = 0; i < profKeys.length; i++) {
        const query =
            'SELECT courses FROM teaching_academic_staff WHERE tas_id = $1';
        const res = await client.query(query, [profKeys[i]]);
        const courses = res.rows[0].courses;

        // loop thru all the assigned sa kanya -
        let specProfSched = TASSchedule[profKeys[i]];
        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let dailySpecProfSched = specProfSched[SCHOOL_DAYS[j]];

            for (let k = 0; k < dailySpecProfSched.length; k++) {
                let schedBlock = dailySpecProfSched[k];

                if (!courses.includes(schedBlock.course)) {
                    // pag wala pa
                    if (
                        !violations.find(
                            (v: any) =>
                                v.TAS === profKeys[i] &&
                                v.course === schedBlock.course
                        )
                    ) {
                        let specViolation = {
                            id: uuidv4(),
                            schedBlockId: schedBlock.id,
                            year: { current: schedBlock.year },
                            course: { current: schedBlock.course },
                            section: {
                                current: `${schedBlock.year}${schedBlock.section}`
                            },
                            type: 'tasSpecialty',
                            description: 'TAS assignment not specialty',
                            time: {
                                day: SCHOOL_DAYS[j],
                                time: {
                                    start: schedBlock.timeBlock.start,
                                    end: schedBlock.timeBlock.end
                                }
                            }
                        };

                        violationCount++;

                        // class violations
                        if (!structuredClassViolations[schedBlock.department]) {
                            structuredClassViolations[schedBlock.department] = {
                                1: {},
                                2: {},
                                3: {},
                                4: {}
                            };
                        }
                        if (
                            !structuredClassViolations[schedBlock.department][
                                schedBlock.year
                            ][schedBlock.section]
                        ) {
                            structuredClassViolations[schedBlock.department][
                                schedBlock.year
                            ][schedBlock.section] = {
                                perSchedBlock: [],
                                perSection: []
                            };
                        }
                        structuredClassViolations[schedBlock.department][
                            schedBlock.year
                        ][schedBlock.section]['perSchedBlock'].push(
                            specViolation
                        );

                        // tas violations
                        if (profKeys[i] == 'GENED_PROF') {
                            continue;
                        }

                        if (!structuredTASViolations[profKeys[i]]) {
                            structuredTASViolations[profKeys[i]] = {
                                perSchedBlock: [],
                                perTAS: []
                            };
                        }
                        structuredTASViolations[profKeys[i]][
                            'perSchedBlock'
                        ].push(specViolation);

                        violations.push(specViolation);
                    }
                }
            }
        }
    }

    return {
        violationCount,
        violations
    };
};

// meron din for tas
const evaluateDayLength = (
    schedule: any,
    type: string,
    structuredClassViolations: any,
    structuredTASViolations: any
) => {
    let violationCount = 0;
    let violations: any = [];

    if (type === 'CLASS') {
        let departmentKeys = Object.keys(schedule);
        for (let i = 0; i < departmentKeys.length; i++) {
            let departmentSched = schedule[departmentKeys[i]];

            let yearKeys = Object.keys(departmentSched);
            for (let j = 0; j < yearKeys.length; j++) {
                let yearSched = departmentSched[yearKeys[j]];

                let classKeys = Object.keys(yearSched);
                for (let k = 0; k < classKeys.length; k++) {
                    let classSched = yearSched[classKeys[k]];

                    for (let m = 0; m < SCHOOL_DAYS.length; m++) {
                        let daySched = classSched[SCHOOL_DAYS[m]];

                        if ((daySched?.length ?? 0) <= 0) {
                            continue;
                        }

                        let dailyUnits = 0;
                        for (let n = 0; n < daySched.length; n++) {
                            let schedBlock = daySched[n];
                            dailyUnits += schedBlock.unitsPerClass;
                        }

                        if (dailyUnits > 8) {
                            let specViolation = {
                                id: uuidv4(),
                                year: { current: yearKeys[j] },
                                section: {
                                    current: `${yearKeys[j]}${classKeys[k]}`
                                },
                                time: {
                                    day: SCHOOL_DAYS[m]
                                },
                                type: 'day length assignment',
                                description:
                                    'Section assigned more than 8 hours a day'
                            };

                            violationCount++;

                            // class violations
                            if (!structuredClassViolations[departmentKeys[i]]) {
                                structuredClassViolations[departmentKeys[i]] = {
                                    1: {},
                                    2: {},
                                    3: {},
                                    4: {}
                                };
                            }
                            if (
                                !structuredClassViolations[departmentKeys[i]][
                                    yearKeys[j]
                                ][classKeys[k]]
                            ) {
                                structuredClassViolations[departmentKeys[i]][
                                    yearKeys[j]
                                ][classKeys[k]] = {
                                    perSchedBlock: [],
                                    perSection: []
                                };
                            }
                            structuredClassViolations[departmentKeys[i]][
                                yearKeys[j]
                            ][classKeys[k]]['perSection'].push(specViolation);

                            violations.push(specViolation);
                        }
                    }
                }
            }
        }
    } else if (type === 'TAS') {
        let profKeys = Object.keys(schedule);
        for (let i = 0; i < profKeys.length; i++) {
            // loop thru all the assigned sa kanya -
            let specProfSched = schedule[profKeys[i]];
            for (let j = 0; j < SCHOOL_DAYS.length; j++) {
                let dailySpecProfSched = specProfSched[SCHOOL_DAYS[j]];

                if ((dailySpecProfSched?.length ?? 0) <= 0) {
                    continue;
                }

                let dailyUnits = 0;
                for (let n = 0; n < dailySpecProfSched.length; n++) {
                    let schedBlock = dailySpecProfSched[n];
                    dailyUnits += schedBlock.unitsPerClass;
                }

                if (dailyUnits > 8) {
                    let specViolation = {
                        id: uuidv4(),
                        tas: profKeys[i],
                        time: {
                            day: SCHOOL_DAYS[j]
                        },
                        type: 'dayLength(TAS)',
                        description: 'TAS assigned more than 8 hours a day'
                    };

                    violationCount++;

                    if (profKeys[i] == 'GENED_PROF') {
                        continue;
                    }

                    if (!structuredTASViolations[profKeys[i]]) {
                        structuredTASViolations[profKeys[i]] = {
                            perSchedBlock: [],
                            perTAS: []
                        };
                    }

                    structuredTASViolations[profKeys[i]]['perTAS'].push(
                        specViolation
                    );
                    violations.push(specViolation);
                }
            }
        }
    }

    return {
        violations,
        violationCount
    };
};

const evaluateClassLength = (
    schedule: any,
    type: string,
    structuredClassViolations: any,
    structuredTASViolations: any
) => {
    let violationCount = 0;
    let violations: any = [];

    if (type === 'class') {
        let departmentKeys = Object.keys(schedule);
        for (let i = 0; i < departmentKeys.length; i++) {
            let departmentSched = schedule[departmentKeys[i]];

            let yearKeys = Object.keys(departmentSched);
            for (let j = 0; j < yearKeys.length; j++) {
                let yearSched = departmentSched[yearKeys[j]];

                let classKeys = Object.keys(yearSched);
                for (let k = 0; k < classKeys.length; k++) {
                    let classSched = yearSched[classKeys[k]];

                    for (let m = 0; m < SCHOOL_DAYS.length; m++) {
                        let daySched = classSched[SCHOOL_DAYS[m]];

                        if (!daySched) {
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

                        let hours = 0;
                        for (let l = 0; l < ascendingSched.length - 1; l++) {
                            if (ascendingSched[l].course.type === 'lec') {
                                hours += ascendingSched[l].course.units;
                            } else {
                                hours += ascendingSched[l].course.units * 3;
                            }

                            let schedBlock = ascendingSched[l];

                            if (hours > 3) {
                                let specViolation = {
                                    id: uuidv4(),
                                    schedBlockId: schedBlock.id,
                                    year: { current: yearKeys[j] },
                                    course: {
                                        current: schedBlock.course.subjectCode
                                    },
                                    section: {
                                        current: `${yearKeys[j]}${classKeys[k]}`
                                    },
                                    time: {
                                        day: SCHOOL_DAYS[m]
                                    },
                                    type: 'class length assignment',
                                    description:
                                        'Section assigned more than 3 consecutive hours of class'
                                };

                                violationCount++;

                                // class violations
                                if (
                                    !structuredClassViolations[
                                        departmentKeys[i]
                                    ]
                                ) {
                                    structuredClassViolations[
                                        departmentKeys[i]
                                    ] = {
                                        1: {},
                                        2: {},
                                        3: {},
                                        4: {}
                                    };
                                }
                                if (
                                    !structuredClassViolations[
                                        departmentKeys[i]
                                    ][yearKeys[j]][classKeys[k]]
                                ) {
                                    structuredClassViolations[
                                        departmentKeys[i]
                                    ][yearKeys[j]][classKeys[k]] = {
                                        perSchedBlock: [],
                                        perSection: []
                                    };
                                }
                                structuredClassViolations[departmentKeys[i]][
                                    yearKeys[j]
                                ][classKeys[k]]['perSchedBlock'].push(
                                    specViolation
                                );

                                violations.push(specViolation);
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
        }
    } else {
        let profKeys = Object.keys(schedule);
        for (let i = 0; i < profKeys.length; i++) {
            let specProfSched = schedule[profKeys[i]];
            for (let j = 0; j < SCHOOL_DAYS.length; j++) {
                let dailySpecProfSched = specProfSched[SCHOOL_DAYS[j]];

                let ascendingSched = dailySpecProfSched.sort(
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

                    let schedBlock = ascendingSched[l];

                    if (hours > 3) {
                        violationCount++;
                        violations.push({
                            type: 'TAS assigned more than 3 consecutive hours of class',
                            TAS: profKeys[i],
                            day: SCHOOL_DAYS[j],
                            courses: [ascendingSched[l].course.subject_code],
                            time: ascendingSched[l].timeBlock.start
                        });

                        // tas violations

                        let specViolation = {
                            id: uuidv4(),
                            schedBlockId: schedBlock.id,
                            tas: profKeys[i],
                            time: {
                                day: SCHOOL_DAYS[j]
                            },
                            type: 'classLength(TAS)',
                            description:
                                'TAS assigned more than 3 consecutive hours of class'
                        };

                        if (
                            !schedBlock.tas ||
                            schedBlock.tas.tas_id == 'GENED_PROF'
                        ) {
                            continue;
                        }

                        if (!structuredTASViolations[profKeys[i]]) {
                            structuredTASViolations[profKeys[i]] = {
                                perSchedBlock: [],
                                perTAS: []
                            };
                        }
                        structuredTASViolations[profKeys[i]][
                            'perSchedBlock'
                        ].push(specViolation);
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

    return {
        violationCount,
        violations
    };
};

const evaluateGenedConstraints = async (
    classSchedule: any,
    structuredClassViolations: any
) => {
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

    let departmentKeys = Object.keys(classSchedule);
    for (let i = 0; i < departmentKeys.length; i++) {
        let departmentSched = classSchedule[departmentKeys[i]];

        let yearKeys = Object.keys(departmentSched);
        for (let j = 0; j < yearKeys.length; j++) {
            let yearSched = departmentSched[yearKeys[j]];

            let classKeys = Object.keys(yearSched);
            for (let k = 0; k < classKeys.length; k++) {
                let classSched = yearSched[classKeys[k]];

                for (let m = 0; m < SCHOOL_DAYS.length; m++) {
                    let daySched = classSched[SCHOOL_DAYS[m]];

                    if (!daySched) {
                        continue;
                    }

                    for (let l = 0; l < daySched.length; l++) {
                        let schedBlock = daySched[l];

                        if (schedBlock.course.category !== 'gened') {
                            continue;
                        }

                        let constraints =
                            genedCoursesAndConstraints[
                                schedBlock.course.subjectCode
                            ][SCHOOL_DAYS[m]];
                        for (let n = 0; n < constraints.length; n++) {
                            if (
                                parseInt(schedBlock.timeBlock.start) >
                                    parseInt(constraints[n].start) &&
                                parseInt(schedBlock.timeBlock.end) <
                                    parseInt(constraints[n].end)
                            ) {
                                let specViolation = {
                                    id: uuidv4(),
                                    schedBlockId: schedBlock.id,
                                    year: { current: yearKeys[j] },
                                    course: {
                                        current: schedBlock.course.subjectCode
                                    },
                                    section: {
                                        current: `${yearKeys[j]}${classKeys[k]}`
                                    },
                                    room: schedBlock.room,
                                    time: {
                                        day: SCHOOL_DAYS[m],
                                        time: {
                                            start: schedBlock.timeBlock.start,
                                            end: schedBlock.timeBlock.end
                                        }
                                    },
                                    type: 'gened class assignment',
                                    description:
                                        'Gened course constraint not followed'
                                };

                                violationCount++;

                                // class violations
                                if (
                                    !structuredClassViolations[
                                        departmentKeys[i]
                                    ]
                                ) {
                                    structuredClassViolations[
                                        departmentKeys[i]
                                    ] = {
                                        1: {},
                                        2: {},
                                        3: {},
                                        4: {}
                                    };
                                }
                                if (
                                    !structuredClassViolations[
                                        departmentKeys[i]
                                    ][yearKeys[j]][classKeys[k]]
                                ) {
                                    structuredClassViolations[
                                        departmentKeys[i]
                                    ][yearKeys[j]][classKeys[k]] = {
                                        perSchedBlock: [],
                                        perSection: []
                                    };
                                }
                                structuredClassViolations[departmentKeys[i]][
                                    yearKeys[j]
                                ][classKeys[k]]['perSchedBlock'].push(
                                    specViolation
                                );

                                violations.push(specViolation);
                            }
                        }
                        // check if within ung timeslot neto don sa constraint ng
                    }
                }
            }
        }
    }

    return {
        violationCount,
        violations
    };
};

export const evaluateClassNumber = (
    classSchedule: any,
    structuredClassViolations: any
) => {
    let violationCount = 0;
    let violations: any = [];

    let departmentKeys = Object.keys(classSchedule);
    for (let i = 0; i < departmentKeys.length; i++) {
        let departmentSched = classSchedule[departmentKeys[i]];

        let yearKeys = Object.keys(departmentSched);
        for (let j = 0; j < yearKeys.length; j++) {
            let yearSched = departmentSched[yearKeys[j]];

            let classKeys = Object.keys(yearSched);
            for (let k = 0; k < classKeys.length; k++) {
                let classSched = yearSched[classKeys[k]];

                for (let m = 0; m < SCHOOL_DAYS.length; m++) {
                    let daySched = classSched[SCHOOL_DAYS[m]];

                    if (!daySched) {
                        continue;
                    }

                    if (daySched.length === 1) {
                        let specViolation = {
                            id: uuidv4(),
                            schedBlockId: daySched[0].id,
                            year: { current: yearKeys[j] },
                            course: { current: daySched[0].course.subjectCode },
                            section: {
                                current: `${yearKeys[j]}${classKeys[k]}`
                            },
                            time: {
                                day: SCHOOL_DAYS[m]
                            },
                            type: 'class number assignment',
                            description: 'Class assinged only 1 class in 1 day'
                        };

                        violationCount++;

                        // class violations
                        if (!structuredClassViolations[departmentKeys[i]]) {
                            structuredClassViolations[departmentKeys[i]] = {
                                1: {},
                                2: {},
                                3: {},
                                4: {}
                            };
                        }
                        if (
                            !structuredClassViolations[departmentKeys[i]][
                                yearKeys[j]
                            ][classKeys[k]]
                        ) {
                            structuredClassViolations[departmentKeys[i]][
                                yearKeys[j]
                            ][classKeys[k]] = {
                                perSchedBlock: [],
                                perSection: []
                            };
                        }
                        structuredClassViolations[departmentKeys[i]][
                            yearKeys[j]
                        ][classKeys[k]]['perSchedBlock'].push(specViolation);

                        violations.push(specViolation);
                    }
                }
            }
        }
    }

    return {
        violationCount,
        violations
    };
};

const evaluateAllowedDays = async (
    classSchedule: any,
    structuredClassViolations: any
) => {
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
        ``;

        allowedDaysPerYearAndDepartment[ad.department][ad.year][
            'available_days'
        ] = ad.available_days;
        allowedDaysPerYearAndDepartment[ad.department][ad.year]['max_days'] =
            ad.max_days;
    });

    let departmentKeys = Object.keys(classSchedule);
    for (let i = 0; i < departmentKeys.length; i++) {
        let departmentSched = classSchedule[departmentKeys[i]];

        let yearKeys = Object.keys(departmentSched);
        for (let j = 0; j < yearKeys.length; j++) {
            let yearSched = departmentSched[yearKeys[j]];

            let classKeys = Object.keys(yearSched);
            for (let k = 0; k < classKeys.length; k++) {
                let classSched = yearSched[classKeys[k]];

                // defaullt
                let specAllowedDays = allowedDaysPerYearAndDepartment[
                    departmentKeys[i]
                ]
                    ? allowedDaysPerYearAndDepartment[departmentKeys[i]][
                          yearKeys[j]
                      ]
                        ? allowedDaysPerYearAndDepartment[departmentKeys[i]][
                              yearKeys[j]
                          ]
                        : { available_days: SCHOOL_DAYS, max_days: 6 }
                    : { available_days: SCHOOL_DAYS, max_days: 6 };

                let assignedDays = 0;
                loop1: for (let m = 0; m < SCHOOL_DAYS.length; m++) {
                    let daySched = classSched[SCHOOL_DAYS[m]];

                    if (!daySched) {
                        continue loop1;
                    }

                    if (daySched.length >= 1) {
                        assignedDays++;

                        if (
                            !specAllowedDays.available_days.includes(
                                SCHOOL_DAYS[m]
                            )
                        ) {
                            let specViolation = {
                                id: uuidv4(),
                                schedBlockId: daySched[0].id,
                                year: { current: yearKeys[j] },
                                course: {
                                    current: daySched[0].course.subjectCode
                                },
                                section: {
                                    current: `${yearKeys[j]}${classKeys[k]}`
                                },
                                room: daySched[0].room,
                                type: 'allowed days assignment',
                                time: {
                                    day: SCHOOL_DAYS[m]
                                },
                                description:
                                    'Course(s) assigned to restricted day'
                            };

                            violationCount++;

                            // class violations
                            if (!structuredClassViolations[departmentKeys[i]]) {
                                structuredClassViolations[departmentKeys[i]] = {
                                    1: {},
                                    2: {},
                                    3: {},
                                    4: {}
                                };
                            }
                            if (
                                !structuredClassViolations[departmentKeys[i]][
                                    yearKeys[j]
                                ][classKeys[k]]
                            ) {
                                structuredClassViolations[departmentKeys[i]][
                                    yearKeys[j]
                                ][classKeys[k]] = {
                                    perSchedBlock: [],
                                    perSection: []
                                };
                            }
                            structuredClassViolations[departmentKeys[i]][
                                yearKeys[j]
                            ][classKeys[k]]['perSchedBlock'].push(
                                specViolation
                            );

                            violations.push(specViolation);

                            // continue loop1; // one time lng need
                        }
                    }
                }

                if (assignedDays > specAllowedDays.max_days) {
                    let specViolation = {
                        id: uuidv4(),
                        year: { current: yearKeys[j] },
                        section: { current: `${yearKeys[j]}${classKeys[k]}` },
                        type: 'allowed number of days assignment',
                        description:
                            'Course(s) assigned to more than allowed day'
                    };

                    violationCount++;

                    // class violations
                    if (!structuredClassViolations[departmentKeys[i]]) {
                        structuredClassViolations[departmentKeys[i]] = {
                            1: {},
                            2: {},
                            3: {},
                            4: {}
                        };
                    }
                    if (
                        !structuredClassViolations[departmentKeys[i]][
                            yearKeys[j]
                        ][classKeys[k]]
                    ) {
                        structuredClassViolations[departmentKeys[i]][
                            yearKeys[j]
                        ][classKeys[k]] = {
                            perSchedBlock: [],
                            perSection: []
                        };
                    }
                    structuredClassViolations[departmentKeys[i]][yearKeys[j]][
                        classKeys[k]
                    ]['perSection'].push(specViolation);

                    violations.push(specViolation);
                }
            }
        }
    }

    return {
        violationCount,
        violations
    };
};

const evaluateAllowedTime = async (
    classSchedule: any,
    structuredClassViolations: any
) => {
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

    let departmentKeys = Object.keys(classSchedule);
    for (let i = 0; i < departmentKeys.length; i++) {
        let departmentSched = classSchedule[departmentKeys[i]];

        let yearKeys = Object.keys(departmentSched);
        for (let j = 0; j < yearKeys.length; j++) {
            let yearSched = departmentSched[yearKeys[j]];

            // defaullt
            let specAllowedTime = allowedTimePerYearAndDepartment[
                departmentKeys[i]
            ]
                ? allowedTimePerYearAndDepartment[departmentKeys[i]][
                      yearKeys[j]
                  ]
                    ? allowedTimePerYearAndDepartment[departmentKeys[i]][
                          yearKeys[j]
                      ]
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

            let classKeys = Object.keys(yearSched);
            for (let k = 0; k < classKeys.length; k++) {
                let classSched = yearSched[classKeys[k]];

                for (let m = 0; m < SCHOOL_DAYS.length; m++) {
                    let daySched = classSched[SCHOOL_DAYS[m]];

                    if (!daySched) {
                        continue;
                    }

                    let constraints =
                        specAllowedTime.restrictions[SCHOOL_DAYS[m]];

                    for (let l = 0; l < daySched.length; l++) {
                        let schedBlock = daySched[l];

                        for (let n = 0; n < constraints.length; n++) {
                            if (
                                parseInt(schedBlock.timeBlock.start) >
                                    parseInt(constraints[n].start) &&
                                parseInt(schedBlock.timeBlock.end) <
                                    parseInt(constraints[n].end)
                            ) {
                                let specViolation = {
                                    id: uuidv4(),
                                    schedBlockId: schedBlock.id,
                                    year: { current: yearKeys[j] },
                                    course: {
                                        current: schedBlock.course.subjectCode
                                    },
                                    section: {
                                        current: `${yearKeys[j]}${classKeys[k]}`
                                    },
                                    room: schedBlock.room,
                                    time: {
                                        day: SCHOOL_DAYS[m],
                                        time: {
                                            start: schedBlock.timeBlock.start,
                                            end: schedBlock.timeBlock.end
                                        }
                                    },
                                    type: 'allowed time assignment',
                                    description:
                                        'Course(s) assigned to restricted time'
                                };

                                violationCount++;

                                // class violations
                                if (
                                    !structuredClassViolations[
                                        departmentKeys[i]
                                    ]
                                ) {
                                    structuredClassViolations[
                                        departmentKeys[i]
                                    ] = {
                                        1: {},
                                        2: {},
                                        3: {},
                                        4: {}
                                    };
                                }
                                if (
                                    !structuredClassViolations[
                                        departmentKeys[i]
                                    ][yearKeys[j]][classKeys[k]]
                                ) {
                                    structuredClassViolations[
                                        departmentKeys[i]
                                    ][yearKeys[j]][classKeys[k]] = {
                                        perSchedBlock: [],
                                        perSection: []
                                    };
                                }
                                structuredClassViolations[departmentKeys[i]][
                                    yearKeys[j]
                                ][classKeys[k]]['perSchedBlock'].push(
                                    specViolation
                                );

                                violations.push(specViolation);
                            }
                        }
                    }
                }
            }
        }
    }

    return {
        violationCount,
        violations
    };
};

const evaluateRestDays = (
    schedule: any,
    type: string,
    structuredClassViolations: any,
    structuredTASViolations: any
) => {
    let violationCount = 0;
    let violations: any = [];

    if (type === 'CLASS') {
        let departmentKeys = Object.keys(schedule);
        for (let i = 0; i < departmentKeys.length; i++) {
            let departmentSched = schedule[departmentKeys[i]];

            let yearKeys = Object.keys(departmentSched);
            for (let j = 0; j < yearKeys.length; j++) {
                let yearSched = departmentSched[yearKeys[j]];

                let classKeys = Object.keys(yearSched);
                for (let k = 0; k < classKeys.length; k++) {
                    let classSched = yearSched[classKeys[k]];

                    let restDays = 1;
                    for (let m = 0; m < SCHOOL_DAYS.length; m++) {
                        let daySched = classSched[SCHOOL_DAYS[m]];

                        if (!daySched) {
                            restDays++;
                            continue;
                        }

                        if (daySched.length <= 0) {
                            restDays++;
                        }
                    }

                    if (restDays < 2) {
                        let specViolation = {
                            id: uuidv4(),
                            year: { current: yearKeys[j] },
                            section: {
                                current: `${yearKeys[j]}${classKeys[k]}`
                            },
                            type: 'rest days assignment',
                            description:
                                'Section assigned rest days less than ideal'
                        };

                        violationCount++;

                        // class violations
                        if (!structuredClassViolations[departmentKeys[i]]) {
                            structuredClassViolations[departmentKeys[i]] = {
                                1: {},
                                2: {},
                                3: {},
                                4: {}
                            };
                        }
                        if (
                            !structuredClassViolations[departmentKeys[i]][
                                yearKeys[j]
                            ][classKeys[k]]
                        ) {
                            structuredClassViolations[departmentKeys[i]][
                                yearKeys[j]
                            ][classKeys[k]] = {
                                perSchedBlock: [],
                                perSection: []
                            };
                        }
                        structuredClassViolations[departmentKeys[i]][
                            yearKeys[j]
                        ][classKeys[k]]['perSection'].push(specViolation);

                        violations.push(specViolation);
                    }
                }
            }
        }
    } else if (type === 'TAS') {
        let profKeys = Object.keys(schedule);
        for (let i = 0; i < profKeys.length; i++) {
            let specProfSched = schedule[profKeys[i]];
            let restDays = 1;
            for (let j = 0; j < SCHOOL_DAYS.length; j++) {
                let dailySpecProfSched = specProfSched[SCHOOL_DAYS[j]];

                if (!dailySpecProfSched) {
                    restDays++;
                    continue;
                }

                if (dailySpecProfSched.length <= 0) {
                    restDays++;
                }
            }

            if (restDays < 2) {
                // tas violations

                violationCount++;

                let specViolation = {
                    id: uuidv4(),
                    tas: profKeys[i],
                    type: 'restDays(TAS)',
                    description: 'TAS assigned less than ideal rest days'
                };

                if (profKeys[i] == 'GENED_PROF') {
                    continue;
                }

                if (!structuredTASViolations[profKeys[i]]) {
                    structuredTASViolations[profKeys[i]] = {
                        perSchedBlock: [],
                        perTAS: []
                    };
                }
                structuredTASViolations[profKeys[i]]['perTAS'].push(
                    specViolation
                );

                violations.push(specViolation);
            }
        }
    }

    return {
        violationCount,
        violations
    };
};

const evaluateTasRequests = async (
    TASSchedule: any,
    structuredTASViolations: any
) => {
    let violationCount = 0;
    let violations: any = [];

    const TASRequests: any = {};

    const getTASRequestsQuery =
        'SELECT tas_id, restrictions, restriction_type FROM teaching_academic_staff';
    const res = await client.query(getTASRequestsQuery);
    const TASRequestsRes = res.rows;

    TASRequestsRes.forEach((tas: any) => {
        TASRequests[tas.tas_id] = {
            restrictions: tas.restrictions,
            restrictionType: tas.restriction_type
        };
    });

    let profKeys = Object.keys(TASSchedule);
    for (let i = 0; i < profKeys.length; i++) {
        let specProfSched = TASSchedule[profKeys[i]];

        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let dailySpecProfSched = specProfSched[SCHOOL_DAYS[j]];

            let constraints = TASRequests[profKeys[i]]
                ? TASRequests[profKeys[i]][SCHOOL_DAYS[j]]?.restrictions
                    ? TASRequests[profKeys[i]][SCHOOL_DAYS[j]].restrictions
                    : []
                : [];
            let restrictionType = TASRequests[profKeys[i]]
                ? TASRequests[profKeys[i]][SCHOOL_DAYS[j]]?.restrictionType
                    ? TASRequests[profKeys[i]][SCHOOL_DAYS[j]].restrictionType
                    : 'soft'
                : 'soft';

            for (let k = 0; k < dailySpecProfSched.length; k++) {
                let schedBlock = dailySpecProfSched[k];

                for (let m = 0; m < constraints.length; m++) {
                    if (
                        (parseInt(schedBlock.timeBlock.start) >=
                            parseInt(constraints[m].start) &&
                            parseInt(schedBlock.timeBlock.start) <
                                parseInt(constraints[m].end)) ||
                        (parseInt(schedBlock.timeBlock.end) >
                            parseInt(constraints[m].start) &&
                            parseInt(schedBlock.timeBlock.end) <=
                                parseInt(constraints[m].end)) ||
                        (parseInt(schedBlock.timeBlock.start) <=
                            parseInt(constraints[m].start) &&
                            parseInt(schedBlock.timeBlock.end) >=
                                parseInt(constraints[m].end)) ||
                        (parseInt(schedBlock.timeBlock.start) >=
                            parseInt(constraints[m].start) &&
                            parseInt(schedBlock.timeBlock.end) <=
                                parseInt(constraints[m].end))
                    ) {
                        if (restrictionType === 'hard') {
                            let specViolation = {
                                id: uuidv4(),
                                tas: profKeys[i],
                                type: 'tasRequests',
                                time: {
                                    day: SCHOOL_DAYS[j],
                                    time: {
                                        start: schedBlock.timeBlock.start,
                                        end: schedBlock.timeBlock.end
                                    }
                                },
                                description: 'Violated hard TAS request'
                            };

                            if (profKeys[i] == 'GENED_PROF') {
                                continue;
                            }

                            if (!structuredTASViolations[profKeys[i]]) {
                                structuredTASViolations[profKeys[i]] = {
                                    perSchedBlock: [],
                                    perTAS: []
                                };
                            }
                            structuredTASViolations[profKeys[i]][
                                'perSchedBlock'
                            ].push(specViolation);

                            violationCount++;
                            violations.push(specViolation);
                        }
                    }
                }
            }
        }
    }

    return {
        violationCount,
        violations
    };
};

const evaluateRoomProximity = (
    classSchedule: any,
    structuredClassViolations: any
) => {
    let violationCount = 0;
    let violations: any = [];

    let departmentKeys = Object.keys(classSchedule);
    for (let i = 0; i < departmentKeys.length; i++) {
        let departmentSched = classSchedule[departmentKeys[i]];

        let yearKeys = Object.keys(departmentSched);
        for (let j = 0; j < yearKeys.length; j++) {
            let yearSched = departmentSched[yearKeys[j]];

            let classKeys = Object.keys(yearSched);
            for (let k = 0; k < classKeys.length; k++) {
                let classSched = yearSched[classKeys[k]];

                for (let m = 0; m < SCHOOL_DAYS.length; m++) {
                    let daySched = classSched[SCHOOL_DAYS[m]];

                    if (!daySched) {
                        continue;
                    }

                    for (let l = 0; l < daySched.length - 1; l++) {
                        let schedBlock = daySched[l];
                        let nextSchedBlock = daySched[l + 1];

                        // pwede kasi mag null
                        if (
                            schedBlock.room == null ||
                            nextSchedBlock.room == null
                        ) {
                            continue;
                        }

                        if (schedBlock.room.room_id === 'PE ROOM') {
                            continue;
                        }

                        const rawRoomId =
                            schedBlock.room.room_id || schedBlock.room.roomId;
                        const firstRoomFloor = rawRoomId
                            ? parseInt(rawRoomId.slice(2)) / 100
                            : NaN;
                        // let firstRoomFloor = Math.floor(
                        //     parseInt(schedBlock.room.room_id?.slice(2) ?? schedBlock.room.roomId.slice(2)) / 100
                        // );
                        const nextRawRoomId =
                            nextSchedBlock.room.room_id ||
                            nextSchedBlock.room.roomId;
                        const secondRoomFloor = nextRawRoomId
                            ? parseInt(nextRawRoomId.slice(2)) / 100
                            : NaN;
                        // let secondRoomFloor = Math.floor(
                        //     parseInt(nextSchedBlock.room.room_id?.slice(2) ?? schedBlock.room.roomId.slice(2)) / 100
                        // );

                        if (Math.abs(firstRoomFloor - secondRoomFloor) > 1) {
                            let specViolation = {
                                id: uuidv4(),
                                schedBlockId: schedBlock.id,
                                course: {
                                    current: schedBlock.course.subjectCode
                                },
                                year: { current: yearKeys[j] },
                                section: {
                                    current: `${yearKeys[j]}${classKeys[k]}`
                                },
                                room: schedBlock.room,
                                time: {
                                    day: SCHOOL_DAYS[m],
                                    time: {
                                        start: schedBlock.timeBlock.start,
                                        end: schedBlock.timeBlock.end
                                    }
                                },
                                type: 'room proximity assignment',
                                description:
                                    'Room is too far apart from previous room'
                            };

                            violationCount++;

                            // class violations
                            if (!structuredClassViolations[departmentKeys[i]]) {
                                structuredClassViolations[departmentKeys[i]] = {
                                    1: {},
                                    2: {},
                                    3: {},
                                    4: {}
                                };
                            }
                            if (
                                !structuredClassViolations[departmentKeys[i]][
                                    yearKeys[j]
                                ][classKeys[k]]
                            ) {
                                structuredClassViolations[departmentKeys[i]][
                                    yearKeys[j]
                                ][classKeys[k]] = {
                                    perSchedBlock: [],
                                    perSection: []
                                };
                            }
                            structuredClassViolations[departmentKeys[i]][
                                yearKeys[j]
                            ][classKeys[k]]['perSchedBlock'].push(
                                specViolation
                            );

                            violations.push(specViolation);
                        }
                    }
                }
            }
        }
    }

    return {
        violationCount,
        violations
    };
};

export const violationTypes = [
    'roomType',
    'tasUnits',
    'tasSpecialty',
    'dayLength',
    'classLength',
    'gened',
    'classNum',
    'allowedDays',
    'allowedTime',
    'restDays',
    'tasRequests',
    'roomProximity'
];

export const evaluateV3 = async ({
    schedule,
    TASSchedule,
    roomSchedule,
    semester
}: {
    schedule: any;
    TASSchedule: any;
    roomSchedule: any;
    semester: number;
}) => {
    let score = 100;
    let structuredClassViolations = {};
    let structuredTASViolations = {};
    let allViolations = [];

    for (let i = 0; i < violationTypes.length; i++) {
        let violationType = violationTypes[i];
        let violationCount, violations;

        switch (violationType) {
            case 'roomType':
                ({ violationCount, violations } = evaluateRoomTypeAssignment(
                    schedule,
                    structuredClassViolations,
                    structuredTASViolations
                ));
                allViolations.push({
                    violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * HARD_CONSTRAINT_WEIGHT;
                break;

            // not tied to a single course
            case 'tasUnits':
                ({ violationCount, violations } = await evaluateTASUnits(
                    TASSchedule,
                    structuredTASViolations
                ));
                allViolations.push({
                    violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * HARD_CONSTRAINT_WEIGHT;
                break;

            case 'tasSpecialty':
                ({ violationCount, violations } = await evaluateTASSpecialty(
                    TASSchedule,
                    structuredClassViolations,
                    structuredTASViolations
                ));
                allViolations.push({
                    violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * HARD_CONSTRAINT_WEIGHT;
                break;

            case 'dayLength':
                ({ violationCount, violations } = evaluateDayLength(
                    schedule,
                    'CLASS',
                    structuredClassViolations,
                    structuredTASViolations
                ));
                allViolations.push({
                    violationType: `${violationType}(CLASS)`,
                    violationCount,
                    violations
                });
                score -= violationCount * SOFT_CONSTRAINT_WEIGHT;

                ({ violationCount, violations } = evaluateDayLength(
                    schedule,
                    'TAS',
                    structuredClassViolations,
                    structuredTASViolations
                ));
                allViolations.push({
                    violationType: `${violationType}(TAS)`,
                    violationCount,
                    violations
                });
                score -= violationCount * SOFT_CONSTRAINT_WEIGHT;
                break;

            case 'classLength':
                ({ violationCount, violations } = evaluateClassLength(
                    schedule,
                    'class',
                    structuredClassViolations,
                    structuredTASViolations
                ));
                allViolations.push({
                    violationType: `${violationType}(CLASS)`,
                    violationCount,
                    violations
                });
                score -= violationCount * HARD_CONSTRAINT_WEIGHT;

                ({ violationCount, violations } = evaluateClassLength(
                    TASSchedule,
                    'tas',
                    structuredClassViolations,
                    structuredTASViolations
                ));
                allViolations.push({
                    violationType: `${violationType}(TAS)`,
                    violationCount,
                    violations
                });
                score -= violationCount * MEDIUM_CONSTRAINT_WEIGHT;
                break;

            case 'gened':
                ({ violationCount, violations } =
                    await evaluateGenedConstraints(
                        schedule,
                        structuredClassViolations
                    ));
                allViolations.push({
                    violationType: violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * MEDIUM_CONSTRAINT_WEIGHT;
                break;

            case 'classNum':
                ({ violationCount, violations } = evaluateClassNumber(
                    schedule,
                    structuredClassViolations
                ));
                allViolations.push({
                    violationType: violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * MEDIUM_CONSTRAINT_WEIGHT;
                break;

            case 'allowedDays':
                ({ violationCount, violations } = await evaluateAllowedDays(
                    schedule,
                    structuredClassViolations
                ));
                allViolations.push({
                    violationType: violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * HARD_CONSTRAINT_WEIGHT;
                break;

            case 'allowedTime':
                ({ violationCount, violations } = await evaluateAllowedTime(
                    schedule,
                    structuredClassViolations
                ));
                allViolations.push({
                    violationType: violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * HARD_CONSTRAINT_WEIGHT;
                break;

            case 'restDays':
                ({ violationCount, violations } = evaluateRestDays(
                    schedule,
                    'CLASS',
                    structuredClassViolations,
                    structuredTASViolations
                ));
                allViolations.push({
                    violationType: `${violationType}(CLASS)`,
                    violationCount,
                    violations
                });
                score -= violationCount * MEDIUM_CONSTRAINT_WEIGHT;

                ({ violationCount, violations } = evaluateRestDays(
                    TASSchedule,
                    'TAS',
                    structuredClassViolations,
                    structuredTASViolations
                ));
                allViolations.push({
                    violationType: `${violationType}(TAS)`,
                    violationCount,
                    violations
                });
                score -= violationCount * MEDIUM_CONSTRAINT_WEIGHT;
                break;

            case 'tasRequests':
                ({ violationCount, violations } = await evaluateTasRequests(
                    TASSchedule,
                    structuredTASViolations
                ));
                allViolations.push({
                    violationType: violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * MEDIUM_CONSTRAINT_WEIGHT;
                break;

            case 'roomProximity':
                ({ violationCount, violations } = evaluateRoomProximity(
                    schedule,
                    structuredClassViolations
                ));
                allViolations.push({
                    violationType: violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * SOFT_CONSTRAINT_WEIGHT;
                break;
        }
    }

    return {
        score,
        allViolations,
        structuredClassViolations,
        structuredTASViolations
    };
};
