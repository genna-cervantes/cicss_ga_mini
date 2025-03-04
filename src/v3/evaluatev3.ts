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

                    if (!daySched){
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

export const evaluateV3 = ({
    schedule,
    semester
}: {
    schedule: any;
    semester: number;
}) => {
    let score = 100;
    let allViolations = [];

    // room type
    let {violationCount, violations} = evaluateRoomTypeAssignment(schedule)
    allViolations.push({violationCount, violations})
    score -= violationCount;

    return {
        score,
        allViolations
    }
};
