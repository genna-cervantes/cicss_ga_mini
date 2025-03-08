import { SCHOOL_DAYS } from './constants';
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

    let miniClassSchedule = minimizeClassSchedule(chromosome.classSchedule)

    const id = `CH${generateRandomString(8)}`;
    const query = `INSERT INTO generated_schedule_cache (generated_schedule_cache_id, class_schedule, tas_schedule, room_schedule, violations, score) VALUES (
        $1, $2, $3, $4, $5, $6
    )`;
    const res = await client.query(query, [
        id,
        miniClassSchedule,
        chromosome.TASSchedule,
        chromosome.roomSchedule,
        chromosome.violations,
        chromosome.score
    ]);

    return res.rowCount;
};

export const getClassScheduleBySection = async (
    year: number,
    section: string,
    department: string
) => {
    // get active schedule sa db tapos get only the ssection

    const query = "SELECT class_schedule->'$1'->'$2'->'$3' FROM schedules;"
    const res = await client.query(query, [department, year, section]);
    const data = res.rows[0]

    return data;
};

export const minimizeClassSchedule = (schedule: any) => {
    let miniSchedule = structuredClone(schedule);

    let departmentKeys = Object.keys(miniSchedule);
    for (let i = 0; i < departmentKeys.length; i++) {
        let departmentSched = miniSchedule[departmentKeys[i]];

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

                        let {
                            specificRoomAssignment,
                            totalUnits,
                            restrictions,
                            unitsPerClass,
                            ...minifiedCourse
                        } = schedBlock.course;
                        let { room_id, ...rest } = schedBlock.room;

                        schedBlock.course = minifiedCourse;
                        schedBlock.room = { roomId: room_id };
                    }
                }
            }
        }
    }

    return miniSchedule;
};

let TASViolationTypes = [
    'tasSpecialty',
    'tasUnits',
    'classLength(TAS)',
    'restDays(TAS)',
    'dayLength(TAS)',
    'tasRequests'
];

let classViolationTypes = [
    'roomType',
    'tasSpecialty',
    'dayLength(CLASS)',
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
    console.log('applying tas violations');
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
                            (v: any) => v.violationType === TASViolationTypes[n]
                        )?.violations ?? [];

                    for (let p = 0; p < violationTypeArray.length; p++) {
                        let specViolation = violationTypeArray[p];

                        if (
                            !['tasRequests', 'tasSpecialty'].includes(
                                TASViolationTypes[n]
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
    console.log('applying class violations');
    let departmentKeys = Object.keys(classSchedule);
    for (let i = 0; i < departmentKeys.length; i++) {
        let departmentSched = classSchedule[departmentKeys[i]];

        let yearKeys = Object.keys(departmentSched);
        for (let j = 0; j < yearKeys.length; j++) {
            let yearSched = departmentSched[yearKeys[j]];

            let classKeys = Object.keys(yearSched);
            for (let k = 0; k < classKeys.length; k++) {
                let classSched = yearSched[classKeys[k]];

                classSched.violations = [];

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
                                        v.violationType ===
                                        classViolationTypes[n]
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
                                    classSched.violations.push(specViolation);
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
