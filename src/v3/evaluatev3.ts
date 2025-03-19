import { client } from './scriptV3';
import {
    HARD_CONSTRAINT_WEIGHT,
    MEDIUM_CONSTRAINT_WEIGHT,
    SCHOOL_DAYS,
    SOFT_CONSTRAINT_WEIGHT
} from '../constants';
import { chromosome } from '../data';

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
                                    schedBlockId: schedBlock.id,
                                    year: yearKeys[j],
                                    course: schedBlock.course.subjectCode,
                                    section: classKeys[k],
                                    type: 'room type assignment',
                                    description:
                                        'lec course assigned to lab and vice versa',
                                    time: {
                                        day: SCHOOL_DAYS[k],
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

                                if (schedBlock.tas.tas_id == 'GENED_PROF') {
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
                tas: profKeys[i],
                type: 'tas units assignment',
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
                            schedBlockId: schedBlock.id,
                            year: schedBlock.year,
                            course: schedBlock.course,
                            section: schedBlock.section,
                            type: 'tas specialty assignment',
                            description: 'TAS assignment not specialty',
                            time: {
                                day: SCHOOL_DAYS[j],
                                time: schedBlock.timeBlock.start
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
                                year: yearKeys[j],
                                section: classKeys[k],
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
                        tas: profKeys[i],
                        type: 'day length assignment',
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
                                    schedBlockId: schedBlock.id,
                                    year: yearKeys[j],
                                    course: schedBlock.course.subjectCode,
                                    section: classKeys[k],
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
                            schedBlockId: schedBlock.id,
                            tas: profKeys[i],
                            type: 'class length assignment',
                            description:
                                'TAS assigned more than 3 consecutive hours of class'
                        };

                        if (schedBlock.tas.tas_id == 'GENED_PROF') {
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

const evaluateGenedConstraints = async (classSchedule: any, structuredClassViolations: any) => {
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
                                    schedBlockId: schedBlock.id,
                                    year: yearKeys[j],
                                    course: schedBlock.course.subjectCode,
                                    section: classKeys[k],
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

export const evaluateClassNumber = (classSchedule: any, structuredClassViolations: any) => {
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
                            schedBlockId: daySched[0].id,
                            year: yearKeys[j],
                            course: daySched[0].course.subjectCode,
                            section: classKeys[k],
                            type: 'class number assignment',
                            description:
                                'Class assinged only 1 class in 1 day'
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

    return {
        violationCount,
        violations
    };
};

const evaluateAllowedDays = async (classSchedule: any, structuredClassViolations: any) => {
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
                                schedBlockId: daySched[0].id,
                                year: yearKeys[j],
                                course: daySched[0].course.subjectCode,
                                section: classKeys[k],
                                type: 'allowed days assignment',
                                description:
                                    'Course(s) assigned to restricted day'
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

                            // continue loop1; // one time lng need
                        }
                    }
                }

                if (assignedDays > specAllowedDays.max_days) {

                    let specViolation = {
                        year: yearKeys[j],
                        section: classKeys[k],
                        type: 'allowed number of days assignment',
                        description:
                            'Course(s) assigned to more than allowed day'
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
                    ][classKeys[k]]['perSection'].push(
                        specViolation
                    );

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

const evaluateAllowedTime = async (classSchedule: any, structuredClassViolations: any) => {
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
                                    schedBlockId: schedBlock.id,
                                    year: yearKeys[j],
                                    course: schedBlock.course.subjectCode,
                                    section: classKeys[k],
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

const evaluateRestDays = (schedule: any, type: string, structuredClassViolations: any, structuredTASViolations: any) => {
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
                            year: yearKeys[j],
                            section: classKeys[k],
                            type: 'rest days assignment',
                            description:
                                'Section assigned rest days less than ideal'
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
                        ][classKeys[k]]['perSection'].push(
                            specViolation
                        );

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

                let specViolation = {
                    tas: profKeys[i],
                    type: 'rest days assignment',
                    description:
                        'TAS assigned less than ideal rest days'
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
                    'perTAS'
                ].push(specViolation);
            }
        }
    }

    return {
        violationCount,
        violations
    };
};

const evaluateTasRequests = async (TASSchedule: any, structuredTASViolations: any) => {
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
                                tas: profKeys[i],
                                type: 'tas requests assignment',
                                description:
                                    'Violated hard TAS request'
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
                            violations.push(specViolation)
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

const evaluateRoomProximity = (classSchedule: any, structuredClassViolations: any) => {
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

                        let firstRoomFloor = Math.floor(
                            parseInt(schedBlock.room.room_id.slice(2)) / 100
                        );
                        let secondRoomFloor = Math.floor(
                            parseInt(nextSchedBlock.room.room_id.slice(2)) / 100
                        );

                        if (Math.abs(firstRoomFloor - secondRoomFloor) > 1) {

                            violationCount++;
                            violations.push({
                                schedBlockId: schedBlock.id,
                                type: 'Room proximity ideal not followed',
                                year: yearKeys[j],
                                section: classKeys[k],
                                day: SCHOOL_DAYS[m],
                                courses: [
                                    schedBlock.course.subjectCode,
                                    nextSchedBlock.course.subjectCode
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

                            let specViolation = {
                                schedBlockId: schedBlock.id,
                                course: schedBlock.course.subjectCode,
                                year: yearKeys[j],
                                section: classKeys[k],
                                type: 'room proximity assignment',
                                description:
                                    'Room is too far apart from previous room'
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
                    await evaluateGenedConstraints(schedule, structuredClassViolations));
                allViolations.push({
                    violationType: violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * MEDIUM_CONSTRAINT_WEIGHT;
                break;

            case 'classNum':
                ({ violationCount, violations } =
                    evaluateClassNumber(schedule, structuredClassViolations));
                allViolations.push({
                    violationType: violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * MEDIUM_CONSTRAINT_WEIGHT;
                break;

            case 'allowedDays':
                ({ violationCount, violations } =
                    await evaluateAllowedDays(schedule, structuredClassViolations));
                allViolations.push({
                    violationType: violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * HARD_CONSTRAINT_WEIGHT;
                break;

            case 'allowedTime':
                ({ violationCount, violations } =
                    await evaluateAllowedTime(schedule, structuredClassViolations));
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
                ({ violationCount, violations } =
                    await evaluateTasRequests(TASSchedule, structuredTASViolations));
                allViolations.push({
                    violationType: violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * MEDIUM_CONSTRAINT_WEIGHT;
                break;

            case 'roomProximity':
                ({ violationCount, violations } =
                    evaluateRoomProximity(schedule, structuredClassViolations));
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
