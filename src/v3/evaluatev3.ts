import { client } from './scriptV3';
import { SCHOOL_DAYS } from '../constants';
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
                    violationCount++;
                    violations.push({
                        type: 'TAS assignment not specialty',
                        TAS: schedBlock.prof,
                        courses: schedBlock.course,
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

    return {
        violationCount,
        violations
    };
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
                score -= violationCount;
                break;

            case 'tasUnits':
                ({ violationCount, violations } =
                    await evaluateTASUnits(TASSchedule));
                allViolations.push({
                    violationType,
                    violationCount,
                    violations
                });
                score -= violationCount;
                break;

            case 'tasSpecialty':
                ({ violationCount, violations } =
                    await evaluateTASSpecialty(TASSchedule));
                allViolations.push({
                    violationType,
                    violationCount,
                    violations
                });
                score -= violationCount;
                break;
        }
    }

    return {
        score,
        allViolations
    };
};
