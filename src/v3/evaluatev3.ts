import { client } from './scriptV3';
import {
    HARD_CONSTRAINT_WEIGHT,
    MEDIUM_CONSTRAINT_WEIGHT,
    SCHOOL_DAYS,
    SOFT_CONSTRAINT_WEIGHT
} from '../constants';
import { chromosome } from '../data';

const evaluateRoomTypeAssignment = (classSchedule: any) => {
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
                                violationCount++;
                                violations.push({
                                    course: schedBlock.course.subject_code,
                                    section: classKeys[k],
                                    type: 'room type assignment',
                                    description:
                                        'lec course assigned to lab and vice versa',
                                    time: {
                                        day: SCHOOL_DAYS[k],
                                        time: schedBlock.timeBlock
                                    },
                                    room: schedBlock.room.room_id
                                });
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

const evaluateTASUnits = async (TASSchedule: any) => {
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
            violationCount++;
            violations.push({
                type: 'TAS assignment over max units',
                TAS: profKeys[i],
                assignedUnits: units,
                maxUnits: maxUnits
            });
        }
    }

    return {
        violations,
        violationCount
    };
};

const evaluateTASSpecialty = async (TASSchedule: any) => {
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
                        violationCount++;
                        violations.push({
                            type: 'TAS assignment not specialty',
                            TAS: profKeys[i],
                            course: schedBlock.course,
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
    }

    return {
        violationCount,
        violations
    };
};

const evaluateDayLength = (classSchedule: any) => {
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

                    if ((daySched?.length ?? 0) <= 0) {
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

                    if (dayEnd - dayStart > 1000) {
                        violationCount++;
                        violations.push({
                            type: 'Section assigned more than 10 hours in a day',
                            year: yearKeys[j],
                            section: classKeys[k],
                            day: SCHOOL_DAYS[m],
                            assignedUnits: dayEnd - dayStart
                        });
                    }
                }
            }
        }
    }

    return {
        violations,
        violationCount
    };
};

const evaluateClassLength = (schedule: any, type: string) => {
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

                            if (hours > 3) {
                                violationCount++;
                                violations.push({
                                    type: 'Section assigned more than 3 consecutive hours of class',
                                    section: classKeys[k],
                                    day: SCHOOL_DAYS[m],
                                    courses: [
                                        ascendingSched[l].course.subject_code
                                    ],
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

                    if (hours > 3) {
                        violationCount++;
                        violations.push({
                            type: 'TAS assigned more than 3 consecutive hours of class',
                            tas: profKeys[i],
                            day: SCHOOL_DAYS[j],
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

    return {
        violationCount,
        violations
    };
};

const evaluateGenedConstraints = async (classSchedule: any) => {
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

                    if (!daySched){
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
                                violationCount++;
                                violations.push({
                                    type: 'Gened course constraint not followed',
                                    section: classKeys[k],
                                    day: SCHOOL_DAYS[m],
                                    courses: [schedBlock.course.subjectCode],
                                    time: schedBlock.timeBlock.start
                                });
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
    }
};

const violationTypes = [
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
    let allViolations = [];

    for (let i = 0; i < violationTypes.length; i++) {
        let violationType = violationTypes[i];
        let violationCount, violations;

        switch (violationType) {
            case 'roomType':
                ({ violationCount, violations } =
                    evaluateRoomTypeAssignment(schedule));
                allViolations.push({
                    violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * HARD_CONSTRAINT_WEIGHT;
                break;

            case 'tasUnits':
                ({ violationCount, violations } =
                    await evaluateTASUnits(TASSchedule));
                allViolations.push({
                    violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * HARD_CONSTRAINT_WEIGHT;
                break;

            case 'tasSpecialty':
                ({ violationCount, violations } =
                    await evaluateTASSpecialty(TASSchedule));
                allViolations.push({
                    violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * HARD_CONSTRAINT_WEIGHT;
                break;

            case 'dayLength':
                ({ violationCount, violations } = evaluateDayLength(schedule));
                allViolations.push({
                    violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * SOFT_CONSTRAINT_WEIGHT;
                break;

            case 'classLength':
                ({ violationCount, violations } = evaluateClassLength(
                    schedule,
                    'class'
                ));
                allViolations.push({
                    violationType: `${violationType}(CLASS)`,
                    violationCount,
                    violations
                });
                score -= violationCount * HARD_CONSTRAINT_WEIGHT;

                ({ violationCount, violations } = evaluateClassLength(
                    TASSchedule,
                    'tas'
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
                    await evaluateGenedConstraints(schedule));
                allViolations.push({
                    violationType: violationType,
                    violationCount,
                    violations
                });
                score -= violationCount * MEDIUM_CONSTRAINT_WEIGHT;
                break;
        }
    }

    return {
        score,
        allViolations
    };
};
