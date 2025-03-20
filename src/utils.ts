import { SCHOOL_DAYS } from './constants';
import { chromosome } from './data';
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
    let miniClassSchedule = minimizeClassSchedule(chromosome.classSchedule);

    const id = `CH${generateRandomString(8)}`;
    const query = `INSERT INTO generated_schedule_cache (generated_schedule_cache_id, class_schedule, tas_schedule, room_schedule, class_violations, tas_violations, score) VALUES (
        $1, $2, $3, $4, $5, $6, $7
        )`;
    const res = await client.query(query, [
        id,
        miniClassSchedule,
        chromosome.TASSchedule,
        chromosome.roomSchedule,
        chromosome.structuredClassViolations,
        chromosome.structuredTASViolations,
        chromosome.score
    ]);

    return res.rowCount;
};

export const insertToSchedule = async ({
    classSchedule,
    TASSchedule,
    roomSchedule,
    classViolations,
    tasViolations
}: {
    classSchedule: any;
    TASSchedule: any;
    roomSchedule: any;
    classViolations: any;
    tasViolations: any;
}) => {
    const queryDelete = 'DELETE FROM schedules';
    const resDelete = await client.query(queryDelete);
    const dataDelete = resDelete.rowCount;

    const id = `CH${generateRandomString(8)}`;

    const query = `INSERT INTO schedules (schedule_id, class_schedule, tas_schedule, room_schedule, class_violations, tas_violations) VALUES ($1, $2, $3, $4, $5, $6);`;
    const res = await client.query(query, [
        id,
        classSchedule,
        TASSchedule,
        roomSchedule,
        classViolations,
        tasViolations
    ]);
    const data = res.rowCount;

    return data;
};

export const getClassScheduleBySection = async (
    year: string,
    section: string,
    department: string
) => {
    // get active schedule sa db tapos get only the ssection

    const query =
        'SELECT class_schedule->$1->$2->$3 as class_schedule, class_violations, tas_violations FROM schedules;';
    const res = await client.query(query, [department, `${year}`, section]);

    const schedule = res.rows[0].class_schedule;
    const classViolations = res.rows[0].class_violations;
    const TASViolations = res.rows[0].tas_violations;

    // console.log('violations', violations);

    if (schedule == null) {
        console.log('WTF');
    }

    return {
        schedule,
        classViolations,
        TASViolations
    };
};

export const getTASScheduleByTASId = async (tasId: string) => {

    const query =
        'SELECT tas_schedule->$1 as tas_schedule, class_schedule, class_violations, tas_violations FROM schedules;';
    const res = await client.query(query, [tasId]);

    const TASSchedule = res.rows[0].tas_schedule;
    const classSchedule = res.rows[0].class_schedule;
    const classViolations = res.rows[0].class_violations;
    const TASViolations = res.rows[0].tas_violations;

    if (TASSchedule == null || classSchedule == null) {
        console.log('WTF');
    }

    return {
        TASSchedule,
        classSchedule,
        classViolations,
        TASViolations
    };
};

export const applyRoomIdsToTASSchedule = (TASSchedule: any, classSchedule: any) => {
    let profKeys = Object.keys(TASSchedule)
    for (let i = 0; i < profKeys.length; i++){
        let specProfSched = TASSchedule[profKeys[i]];

        for (let j = 0; j < SCHOOL_DAYS.length; j++){
            let daySched = specProfSched[SCHOOL_DAYS[j]];

            
            for (let k = 0; k < daySched.length; k++){
                let schedBlock = daySched[k];
                
                let classDaySched = classSchedule[schedBlock.department][schedBlock.year][schedBlock.section]

                for (let l = 0; l < classDaySched.length; l++){
                    let classSchedBlock = classDaySched[l]

                    if (schedBlock.id === classSchedBlock.id){

                        schedBlock.room = classSchedBlock.room
                    }
                }
            }
        }
    }
}

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
    tasId: string,
    schedule: any,
    classViolations: any,
    TASViolations: any
) => {
    console.log('applying tas violations');

    schedule.violations = TASViolations?.[tasId] ? TASViolations[tasId]['perTAS'] : [];
    let perSchedBlockViolations = TASViolations?.[tasId] ? TASViolations[tasId]['perSchedBlock'] : [];

    for (let j = 0; j < SCHOOL_DAYS.length; j++) {
        let dailySpecProfSched = schedule[SCHOOL_DAYS[j]];

        for (let k = 0; k < dailySpecProfSched.length; k++) {
            let schedBlock = dailySpecProfSched[k];

            schedBlock.violations = [];

            for (let n = 0; n < TASViolationTypes.length; n++) {
                let violationTypeArray =
                    // di dapat toh mag uundefined e
                    perSchedBlockViolations.find(
                        (v: any) => v.violationType === TASViolationTypes[n]
                    )?.violations ?? [];

                for (let p = 0; p < violationTypeArray.length; p++) {
                    let specViolation = violationTypeArray[p];

                    if (
                        !['tasRequests', 'tasSpecialty'].includes(
                            TASViolationTypes[n]
                        )
                    ) {
                        if (tasId === specViolation.schedBlockId) {
                            // let { schedBlockId, ...rest } =
                            //     specViolation;
                            schedBlock.violations.push(specViolation);
                        }
                    } else {
                        schedule.violations.push(specViolation);
                    }
                }
            }
        }
    }

    return schedule;
};

// separate violations to class (schedblock / general) / tas

export const applyClassViolationsToSchedule = (
    department: string,
    year: string,
    section: string,
    classSchedule: any,
    classViolations: any,
    tasViolations: any
) => {
    // per schedule
    let specSchedBlockViolations = classViolations?.[department]?.[year]?.[section]
        ? classViolations[department][year][section]['perSchedBlock']
        : [];

    // per section
    let specClassViolations = classViolations?.[department]?.[year]?.[section]
        ? classViolations[department][year][section]['perSection']
        : [];
    

    classSchedule.violations = [];
    for (let i = 0; i < SCHOOL_DAYS.length; i++) {
        let daySched = classSchedule[SCHOOL_DAYS[i]];

        console.log(SCHOOL_DAYS[i]);

        if (!daySched) {
            continue;
        }

        for (let j = 0; j < daySched.length; j++) {
            let schedBlock = daySched[j];
            schedBlock.violations = [];

            for (let k = 0; k < specSchedBlockViolations.length; k++) {
                let specViolation = specSchedBlockViolations[k];

                console.log('spec viol', specViolation);

                if (specViolation.schedBlockId) {
                    if (schedBlock.id === specViolation.schedBlockId) {
                        schedBlock.violations.push(specViolation);
                    }
                }
            }

            // tas violations
            if (schedBlock.tas.tas_id !== 'GENED PROF'){
                let specTASViolations = tasViolations?.[schedBlock.tas.tas_id] ? tasViolations?.[schedBlock.tas.tas_id]['perSchedBlock'] : []
                for (let l = 0; l < specTASViolations.length; l++){
                    let specViolation = specTASViolations[l]

                    if (specViolation.schedBlockId) {
                        if (schedBlock.id === specViolation.schedBlockId && !schedBlock.violations.find((viol: any) => viol.id === specViolation.id)) {
                            schedBlock.violations.push(specViolation);
                        }
                    }       
                }
            }
        }
    }

    // per section
    for (let i = 0; i < specClassViolations.length; i++) {
        let specViolation = specClassViolations[i];
        classSchedule.violations.push(specViolation);
    }

    return classSchedule;
};

export const tranformSections = (rawSections: any) => {
    let transformedSections: any = {};

    rawSections.forEach((sec: any) => {
        if (!transformedSections[sec.section]) {
            transformedSections[sec.section] = sec.specialization;
        }
    });

    return transformedSections;
};
