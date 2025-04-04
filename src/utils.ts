import { SCHOOL_DAYS } from './constants';
import { chromosome } from './data';
import { client } from './v3/scriptV3';

export const checkLockedDepartmentsCache = async () => {
    const query =
        'SELECT cs_locked, it_locked, is_locked FROM generated_schedule_cache WHERE is_active = TRUE ORDER BY score LIMIT 1';
    const res = await client.query(query);
    const csLockedCache = res.rows[0]?.cs_locked ?? false;
    const itLockedCache = res.rows[0]?.it_locked ?? false;
    const isLockedCache = res.rows[0]?.is_locked ?? false;

    return {
        csLockedCache,
        itLockedCache,
        isLockedCache
    };
};

export const clearScheduleCache = async () => {
    const query = "DELETE FROM generated_schedule_cache;";
    const res = await client.query(query);
    const data = res.rowCount;

    return data;
}

export const checkLockedDepartments = async () => {
    const query =
        'SELECT cs_locked, it_locked, is_locked FROM schedules WHERE is_active = TRUE';
    const res = await client.query(query);
    const csLocked = res.rows[0]?.cs_locked ?? false;
    const itLocked = res.rows[0]?.it_locked ?? false;
    const isLocked = res.rows[0]?.is_locked ?? false;

    return {
        csLocked,
        itLocked,
        isLocked
    };
};

export const unlockScheduleByDepartment = async (department: string) => {
    let lockDepartment = '';
    switch (department) {
        case 'CS':
            lockDepartment = 'cs_locked';
            break;
        case 'IT':
            lockDepartment = 'it_locked';
            break;
        case 'IS':
            lockDepartment = 'is_locked';
            break;
        default:
            return false;
    }

    const query = `UPDATE schedules SET ${lockDepartment} = FALSE WHERE is_active = TRUE`;
    const res = await client.query(query);

    if (res && res.rowCount && res?.rowCount > 0) {
        return true;
    }

    return false;
};

export const lockScheduleByDepartment = async (department: string) => {
    let lockDepartment = '';
    switch (department) {
        case 'CS':
            lockDepartment = 'cs_locked';
            break;
        case 'IT':
            lockDepartment = 'it_locked';
            break;
        case 'IS':
            lockDepartment = 'is_locked';
            break;
        default:
            return false;
    }

    const query = `UPDATE schedules SET ${lockDepartment} = TRUE WHERE is_active = TRUE`;
    const res = await client.query(query);

    if (res && res.rowCount && res?.rowCount > 0) {
        return true;
    }

    return false;
};

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

    console.log('null nirereturn ng cache');

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
    const query = `INSERT INTO generated_schedule_cache (generated_schedule_cache_id, class_schedule, tas_schedule, room_schedule, class_violations, tas_violations, score, cs_locked, it_locked, is_locked) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )`;
    const res = await client.query(query, [
        id,
        miniClassSchedule,
        chromosome.TASSchedule,
        chromosome.roomSchedule,
        chromosome.structuredClassViolations,
        chromosome.structuredTASViolations,
        chromosome.score,
        chromosome.csLocked,
        chromosome.itLocked,
        chromosome.isLocked
    ]);

    return res.rowCount;
};

export const insertToSchedule = async ({
    classSchedule,
    TASSchedule,
    roomSchedule,
    classViolations,
    tasViolations,
    csLocked,
    itLocked,
    isLocked
}: {
    classSchedule: any;
    TASSchedule: any;
    roomSchedule: any;
    classViolations: any;
    tasViolations: any;
    csLocked: boolean;
    itLocked: boolean;
    isLocked: boolean;
}) => {
    const queryDelete = 'DELETE FROM schedules';
    const resDelete = await client.query(queryDelete);
    const rowCount = resDelete.rowCount;

    console.log('deleted', rowCount);

    const id = `CH${generateRandomString(8)}`;

    const query = `INSERT INTO schedules (schedule_id, class_schedule, tas_schedule, room_schedule, class_violations, tas_violations, cs_locked, is_locked, it_locked) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`;
    const res = await client.query(query, [
        id,
        classSchedule,
        TASSchedule,
        roomSchedule,
        classViolations,
        tasViolations,
        csLocked,
        isLocked,
        itLocked
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

    console.log(department);
    console.log(year);
    console.log(section);

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

export const getRoomScheduleByRoomId = async (roomId: string) => {
    const query =
        'SELECT room_schedule->$1 as room_schedule, class_violations, tas_violations FROM schedules;';
    const res = await client.query(query, [roomId]);

    console.log(roomId);

    const roomSchedule = res.rows[0].room_schedule;
    const classViolations = res.rows[0].class_violations;
    const TASViolations = res.rows[0].tas_violations;

    if (roomSchedule == null) {
        console.log('WTF');
    }

    return {
        roomSchedule,
        classViolations,
        TASViolations
    };
};

export const applyRoomIdsToTASSchedule = (
    TASSchedule: any,
    classSchedule: any
) => {
    console.log('applying room ids');
    for (let j = 0; j < SCHOOL_DAYS.length; j++) {
        let daySched = TASSchedule[SCHOOL_DAYS[j]];

        loop1: for (let k = 0; k < daySched.length; k++) {
            let schedBlock = daySched[k];

            console.log(schedBlock);
            let specClassSched =
                classSchedule[schedBlock.department][schedBlock.year][
                    schedBlock.section
                ];

            for (let m = 0; m < SCHOOL_DAYS.length; m++) {
                // console.log(specClassSched)
                let classDaySched = specClassSched[SCHOOL_DAYS[m]] ?? [];

                console.log(classDaySched);

                for (let l = 0; l < classDaySched.length; l++) {
                    let classSchedBlock = classDaySched[l];

                    if (schedBlock.id === classSchedBlock.id) {
                        console.log('same');
                        schedBlock.room = classSchedBlock.room;
                        continue loop1;
                    }
                }
            }
        }
    }

    return TASSchedule;
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

export const applyViolationsToRoomSchedule = (
    roomId: string,
    roomSchedule: any,
    classViolations: any,
    TASViolations: any
) => {
    console.log('applying to room violations');

    for (let j = 0; j < SCHOOL_DAYS.length; j++) {
        let dailyRoomSchedule = roomSchedule[SCHOOL_DAYS[j]];

        for (let k = 0; k < dailyRoomSchedule.length; k++) {
            let schedBlock = dailyRoomSchedule[k];
            let tasId = schedBlock.tas.tas_id;

            schedBlock.violations = [];
            let department = schedBlock.department;
            let section = schedBlock.section;
            let year = schedBlock.year;

            let perSchedBlockViolations = TASViolations?.[tasId]
                ? TASViolations[tasId]['perSchedBlock']
                : [];

            let specSchedBlockViolations = classViolations?.[department]?.[
                year
            ]?.[section]
                ? classViolations[department][year][section]['perSchedBlock']
                : [];

            console.log('roomid', roomId);
            if (year === '1' && department === 'CS' && section === 'CSB') {
                console.log('class viol', specSchedBlockViolations);
            }

            // for (let n = 0; n < TASViolationTypes.length; n++) {
            //     let violationTypeArray =
            //         // di dapat toh mag uundefined e
            //         perSchedBlockViolations.find(
            //             (v: any) => v.violationType === TASViolationTypes[n]
            //         )?.violations ?? [];

            //     for (let p = 0; p < violationTypeArray.length; p++) {
            //         let specViolation = violationTypeArray[p];

            //         if (
            //             !['tasRequests', 'tasSpecialty'].includes(
            //                 TASViolationTypes[n]
            //             )
            //         ) {
            //             if (tasId === specViolation.schedBlockId) {
            //                 // let { schedBlockId, ...rest } =
            //                 //     specViolation;
            //                 schedBlock.violations.push(specViolation);
            //             }
            //         }
            //     }
            // }
            for (let k = 0; k < specSchedBlockViolations.length; k++) {
                let specViolation = specSchedBlockViolations[k];

                if (specViolation.schedBlockId) {
                    if (
                        specViolation.room == null ||
                        specViolation.room !== schedBlock.room.room_id
                    ) {
                        console.log('di raw pwede');
                        console.log(schedBlock);
                        console.log(specViolation);

                        console.log(specViolation.room?.room_id);
                        console.log(schedBlock.room);
                        continue;
                    }

                    console.log('match viol', specViolation);
                    console.log(schedBlock);
                    console.log(specViolation.room);

                    if (
                        schedBlock.id === specViolation.schedBlockId &&
                        !schedBlock.violations.includes(
                            specViolation.schedBlockId
                        )
                    ) {
                        schedBlock.violations.push(specViolation);
                    }
                }
            }
        }
    }

    return roomSchedule;
};

export const applyTASViolationsToSchedule = (
    tasId: string,
    schedule: any,
    classViolations: any,
    TASViolations: any
) => {
    console.log('applying tas violations');

    schedule.violations = TASViolations?.[tasId]
        ? TASViolations[tasId]['perTAS']
        : [];
    let perSchedBlockViolations = TASViolations?.[tasId]
        ? TASViolations[tasId]['perSchedBlock']
        : [];

    console.log('sched block viol', perSchedBlockViolations);

    for (let j = 0; j < SCHOOL_DAYS.length; j++) {
        let dailySpecProfSched = schedule[SCHOOL_DAYS[j]];

        for (let k = 0; k < dailySpecProfSched.length; k++) {
            let schedBlock = dailySpecProfSched[k];

            schedBlock.violations = [];

            for (let n = 0; n < TASViolationTypes.length; n++) {
                let violationTypeArray =
                    // di dapat toh mag uundefined e
                    perSchedBlockViolations.filter(
                        (v: any) => v.type === TASViolationTypes[n]
                    ) ?? [];

                console.log('type');
                console.log(perSchedBlockViolations);
                console.log(TASViolationTypes[n]);
                console.log(violationTypeArray);

                for (let p = 0; p < violationTypeArray.length; p++) {
                    let specViolation = violationTypeArray[p];

                    if (
                        ['tasRequests', 'tasSpecialty'].includes(
                            TASViolationTypes[n]
                        )
                    ) {
                        if (schedBlock.id === specViolation.schedBlockId) {
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
    let specSchedBlockViolations = classViolations?.[department]?.[year]?.[
        section
    ]
        ? classViolations[department][year][section]['perSchedBlock']
        : [];

    // per section
    let specClassViolations = classViolations?.[department]?.[year]?.[section]
        ? classViolations[department][year][section]['perSection']
        : [];

    classSchedule.violations = specClassViolations;
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
            if (schedBlock.tas.tas_id !== 'GENED PROF') {
                let specTASViolations = tasViolations?.[schedBlock.tas.tas_id]
                    ? tasViolations?.[schedBlock.tas.tas_id]['perSchedBlock']
                    : [];
                for (let l = 0; l < specTASViolations.length; l++) {
                    let specViolation = specTASViolations[l];

                    if (specViolation.schedBlockId) {
                        if (
                            schedBlock.id === specViolation.schedBlockId &&
                            !schedBlock.violations.find(
                                (viol: any) => viol.id === specViolation.id
                            )
                        ) {
                            schedBlock.violations.push(specViolation);
                        }
                    }
                }
            }
        }
    }

    // per section
    // for (let i = 0; i < specClassViolations.length; i++) {
    //     let specViolation = specClassViolations[i];
    //     classSchedule.violations.push(specViolation);
    // }

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

export const getCSSchedule = async () => {
    const query =
        "SELECT class_schedule->'CS' AS csSchedule FROM schedules WHERE is_active = TRUE LIMIT 1;";
    const res = await client.query(query);
    const csSchedule = res.rows[0].csschedule;

    console.log('cs sched')
    console.log(csSchedule)

    return csSchedule;
};
export const getITSchedule = async () => {
    const query =
        "SELECT class_schedule->'IT' AS itSchedule FROM schedules WHERE is_active = TRUE LIMIT 1;";
    const res = await client.query(query);
    const itSchedule = res.rows[0].itschedule;

    return itSchedule;
};
export const getISSchedule = async () => {
    const query =
        "SELECT class_schedule->'IS' AS isSchedule FROM schedules WHERE is_active = TRUE LIMIT 1;";
    const res = await client.query(query);
    const isSchedule = res.rows[0].isschedule;

    return isSchedule;
};

export const getTASScheduleFromDepartmentLockedSchedule = ({
    departments,
    TASSchedule
}: {
    departments: string[];
    TASSchedule: any;
}) => {
    let newTASSchedule: any = {};
    let profKeys = Object.keys(TASSchedule);

    for (let i = 0; i < profKeys.length; i++) {
        let profSchedule = TASSchedule[profKeys[i]];

        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let daySched = profSchedule[SCHOOL_DAYS[j]];

            for (let k = 0; k < daySched.length; k++) {
                let schedBlock = daySched[k];

                for (let m = 0; m < departments.length; m++) {
                    if (schedBlock.department === departments[m]) {
                        if (!newTASSchedule[profKeys[i]]) {
                            newTASSchedule[profKeys[i]] = {
                                M: [],
                                T: [],
                                W: [],
                                TH: [],
                                F: [],
                                S: []
                            };
                        }

                        newTASSchedule[profKeys[i]][SCHOOL_DAYS[j]].push(
                            schedBlock
                        );
                    }
                }
            }
        }
    }

    return newTASSchedule;
    // loop thru class sched
    // loop thru tas schedule
    // keep all that contains the department
    //return
};

export const getRoomScheduleFromDepartmentLockedSchedule = ({
    departments,
    roomSchedule
}: {
    departments: string[];
    roomSchedule: any;
}) => {
    let newRoomSchedule: any = {};
    let roomKeys = Object.keys(roomSchedule);

    for (let i = 0; i < roomKeys.length; i++) {
        let specRoomSchedule = roomSchedule[roomKeys[i]];


        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let daySched = specRoomSchedule[SCHOOL_DAYS[j]];

            for (let k = 0; k < daySched.length; k++) {
                let schedBlock = daySched[k];

                for (let m = 0; m < departments.length; m++) {
                    if (schedBlock.department === departments[m]) {
                        if (!newRoomSchedule[roomKeys[i]]) {
                            newRoomSchedule[roomKeys[i]] = {
                                M: [],
                                T: [],
                                W: [],
                                TH: [],
                                F: [],
                                S: []
                            };
                        }

                        newRoomSchedule[roomKeys[i]][SCHOOL_DAYS[j]].push(
                            schedBlock
                        );
                    }
                }
            }
        }
    }

    console.log(newRoomSchedule)
    return newRoomSchedule;
    // loop thru class sched
    // loop thru tas schedule
    // keep all that contains the department
    //return
};

export const getActiveTASSchedule = async () => {
    const query =
        'SELECT tas_schedule FROM schedules WHERE is_active = TRUE LIMIT 1';
    const res = await client.query(query);
    const tasSchedule = res.rows[0].tas_schedule;

    return tasSchedule;
};

export const getActiveRoomSchedule = async () => {
    const query =
        'SELECT room_schedule FROM schedules WHERE is_active = TRUE LIMIT 1';
    const res = await client.query(query);
    const roomSchedule = res.rows[0].room_schedule;

    return roomSchedule;
};
