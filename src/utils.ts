import { SCHOOL_DAYS } from './constants';
import { violationTypes } from './v3/evaluatev3';
import { client } from './v3/scriptV3';

export const getScheduleFromCache = async () => {
    // get schedule
    const query = 'SELECT * FROM generated_schedule_cache ORDER BY score';
    const res = await client.query(query);
    const topSchedule = res.rows[0];

    // remove that from cache
    const query1 =
        'DELETE FROM generated_schedule_cache WHERE generated_schedule_cache_id = $1';
    await client.query(query1, [topSchedule.generated_schedule_cache_id]);

    return topSchedule;
};

export const applyViolationsToSchedule = (
    classSchedule: any,
    violations: any
) => {
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
                        schedBlock.violations = [];

                        for (let n = 0; n < violationTypes.length; n++) {
                            console.log(violations)
                            console.log(violationTypes)
                            let violationTypeArray =
                            // di dapat toh mag uundefined e
                                violations.find(
                                    (v: any) =>
                                        v.violationType === violationTypes[n]
                                )?.violations ?? [];

                            for (
                                let p = 0;
                                p < violationTypeArray.length;
                                p++
                            ) {
                                let specViolation = violationTypeArray[p];
                                if (
                                    schedBlock.id === specViolation.schedBlockId
                                ) {
                                    // let { schedBlockId, ...rest } =
                                    //     specViolation;
                                    schedBlock.violations.push(specViolation);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return classSchedule;
};
