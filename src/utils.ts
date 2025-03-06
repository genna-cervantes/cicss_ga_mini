import { SCHOOL_DAYS } from './constants';
import { violationTypes } from './v3/evaluatev3';
import { client } from './v3/scriptV3';

export const getScheduleFromCache = async () => {
    // get schedule
    const query = 'SELECT * FROM generated_schedule_cache ORDER BY score';
    const res = await client.query(query);
    const topSchedule = res.rows[0];

    // remove that from cache
    if (topSchedule) {
        const query1 =
            'DELETE FROM generated_schedule_cache WHERE generated_schedule_cache_id = $1';
        await client.query(query1, [topSchedule.generated_schedule_cache_id]);

        return topSchedule;
    }

    return null;
};

const generateRandomString = (length: number = 8): string => {
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const insertToScheduleCache = async (chromosome: any) => {
    const id = `PF${generateRandomString(8)}`;
    const query = `INSERT INTO generated_schedule_cache (generated_schedule_cache_id, classSchedule, TASSchedule, roomSchedule, violations, score) VALUES (
        $1, $2, $3, $4, $5, $6
    )`;
    const res = await client.query(query, [
        id,
        chromosome.classSchedule,
        chromosome.TASSchedule,
        chromosome.roomSchedule,
        chromosome.violations,
        chromosome.score
    ]);

    return res.rowCount;
};

let TASViolationTypes = [
    'tasSpecialty',
    'tasUnits',
    'classLength(TAS)',
    'restDays(TAS)',
    'tasRequests'
];

let classViolationTypes = [
    'roomType',
    'tasSpecialty',
    'dayLength',
    'classLength(CLASS)',
    'gened',
    'classNum',
    'allowedDays',
    'allowedTime',
    'restDays(CLASS)',
    'roomProximity'
];

export const applyTASViolationsToSchedule = (
    TASSchedule: any,
    violations: any
) => {
    let profKeys = Object.keys(TASSchedule);
    for (let i = 0; i < profKeys.length; i++) {
        let specProfSched = TASSchedule[profKeys[i]];

        specProfSched.violations = [];

        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let dailySpecProfSched = specProfSched[SCHOOL_DAYS[j]];

            for (let k = 0; k < dailySpecProfSched.length; k++) {
                let schedBlock = dailySpecProfSched[k];

                schedBlock.violations = [];

                for (let n = 0; n < TASViolationTypes.length; n++) {
                    let violationTypeArray =
                        // di dapat toh mag uundefined e
                        violations.find(
                            (v: any) => v.violationType === violationTypes[n]
                        )?.violations ?? [];

                    for (let p = 0; p < violationTypeArray.length; p++) {
                        let specViolation = violationTypeArray[p];

                        if (
                            !['tasRequests', 'tasSpecialty'].includes(
                                violationTypes[n]
                            )
                        ) {
                            if (profKeys === specViolation.schedBlockId) {
                                // let { schedBlockId, ...rest } =
                                //     specViolation;
                                schedBlock.violations.push(specViolation);
                            }
                        } else {
                            specProfSched.violations.push(specViolation);
                        }
                    }
                }
            }
        }
    }
    return TASSchedule;
};

export const applyClassViolationsToSchedule = (
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

                        for (let n = 0; n < classViolationTypes.length; n++) {
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
                                if (specViolation.schedBlockId) {
                                    if (
                                        schedBlock.id ===
                                        specViolation.schedBlockId
                                    ) {
                                        // let { schedBlockId, ...rest } =
                                        //     specViolation;
                                        schedBlock.violations.push(
                                            specViolation
                                        );
                                    }
                                } else {
                                    classSched.violations =
                                        schedBlock.violations
                                            ? [
                                                  ...schedBlock.violatoins,
                                                  specViolation
                                              ]
                                            : [specViolation];
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
