import { SCHOOL_DAYS } from './constants';

// kkunin ko ung m ng bawat dept
// so ang iccompare for example ay 1csa and 1csb or if may higher year kasama 2csa 2csb etc
// basta may maviolate -10 agad sa score

const groupByDaySchedule = (chromosome: any) => {
    // check cs
    let dayBasedSchedule = {
        M: [] as any,
        T: [] as any,
        W: [] as any,
        TH: [] as any,
        F: [] as any,
        S: [] as any
    };

    let CSYearGene = chromosome.find((gene: any) => gene.cs_1st)?.cs_1st;
    let ITYearGene = chromosome.find((gene: any) => gene.it_1st)?.it_1st;
    let ISYearGene = chromosome.find((gene: any) => gene.is_1st)?.is_1st;

    for (let j = 0; j < CSYearGene.length; j++) {
        const sectionSchedule: {
            M: any;
            T: any;
            W: any;
            TH: any;
            F: any;
            S: any;
        } = Object.values(CSYearGene[j])[0] as {
            M: any;
            T: any;
            W: any;
            TH: any;
            F: any;
            S: any;
        };

        for (let i = 0; i < SCHOOL_DAYS.length; i++) {
            let schoolDay: 'M' | 'T' | 'W' | 'TH' | 'F' | 'S' = SCHOOL_DAYS[
                i
            ] as 'M' | 'T' | 'W' | 'TH' | 'F' | 'S';

            let sectionDaySchedule = sectionSchedule[schoolDay];
            dayBasedSchedule[schoolDay].push(...sectionDaySchedule);
        }
    }

    // check it
    for (let j = 0; j < ITYearGene.length; j++) {
        const sectionSchedule: {
            M: any;
            T: any;
            W: any;
            TH: any;
            F: any;
            S: any;
        } = Object.values(ITYearGene[j])[0] as {
            M: any;
            T: any;
            W: any;
            TH: any;
            F: any;
            S: any;
        };

        for (let i = 0; i < SCHOOL_DAYS.length; i++) {
            let schoolDay: 'M' | 'T' | 'W' | 'TH' | 'F' | 'S' = SCHOOL_DAYS[
                i
            ] as 'M' | 'T' | 'W' | 'TH' | 'F' | 'S';

            let sectionDaySchedule = sectionSchedule[schoolDay];
            dayBasedSchedule[schoolDay].push(...sectionDaySchedule);
        }
    }

    // check is
    for (let j = 0; j < ISYearGene.length; j++) {
        const sectionSchedule: {
            M: any;
            T: any;
            W: any;
            TH: any;
            F: any;
            S: any;
        } = Object.values(ISYearGene[j])[0] as {
            M: any;
            T: any;
            W: any;
            TH: any;
            F: any;
            S: any;
        };

        for (let i = 0; i < SCHOOL_DAYS.length; i++) {
            let schoolDay: 'M' | 'T' | 'W' | 'TH' | 'F' | 'S' = SCHOOL_DAYS[
                i
            ] as 'M' | 'T' | 'W' | 'TH' | 'F' | 'S';

            let sectionDaySchedule = sectionSchedule[schoolDay];
            dayBasedSchedule[schoolDay].push(...sectionDaySchedule);
        }
    }

    return dayBasedSchedule;
};

const checkRoomConstraints = (chromosome: any) => {

    let dayBasedSchedule = groupByDaySchedule(chromosome);

    for (let i = 0; i < SCHOOL_DAYS.length; i++) {
        let schoolDay: 'M' | 'T' | 'W' | 'TH' | 'F' | 'S' = SCHOOL_DAYS[i] as
            | 'M'
            | 'T'
            | 'W'
            | 'TH'
            | 'F'
            | 'S';

        let daySched = dayBasedSchedule[schoolDay];
        let conflicts = findRoomConflicts(daySched);

        if (conflicts.length > 0) {
            for (let i = 0; i < conflicts.length; i++) {
                console.log(conflicts[i].room);
                for (let j = 0; j < conflicts[i].conflict.length; j++) {
                    console.log(conflicts[i].conflict[j]);
                }
            }
            return true;
        }
    }
};

const checkProfConstraints = (chromosome: any) => {
    let dayBasedSchedule = groupByDaySchedule(chromosome);

    for (let i = 0; i < SCHOOL_DAYS.length; i++) {
        let schoolDay: 'M' | 'T' | 'W' | 'TH' | 'F' | 'S' = SCHOOL_DAYS[i] as
            | 'M'
            | 'T'
            | 'W'
            | 'TH'
            | 'F'
            | 'S';

        let daySched = dayBasedSchedule[schoolDay];
        let conflicts = findProfessorConflicts(daySched);

        if (conflicts.length > 0) {
            for (let i = 0; i < conflicts.length; i++) {
                console.log(conflicts[i].professorId);
                console.log(conflicts[i].professor);
                for (let j = 0; j < conflicts[i].conflict.length; j++) {
                    console.log(conflicts[i].conflict[j]);
                }
            }
            return true;
        }
    }
}

const isOverlap = ({ time1, time2 }: { time1: any; time2: any }) => {
    return time1.start < time2.end && time2.start < time1.end;
};

const findRoomConflicts = (schedules: any) => {
    // Step 1: Group by room
    const roomGroups = schedules.reduce((groups: any, schedule: any) => {
        const roomId = schedule.room.room_id;

        // Skip schedules with room_id "PE ROOM"
        if (roomId === 'PE ROOM') {
            return groups;
        }

        if (!groups[roomId]) {
            groups[roomId] = [];
        }
        groups[roomId].push(schedule);

        return groups;
    }, {});

    // Step 2: Check for time conflicts within each room group
    const conflicts = [];
    for (const roomId in roomGroups) {
        const roomSchedules = roomGroups[roomId];

        // Compare each schedule with every other schedule in the same room
        for (let i = 0; i < roomSchedules.length; i++) {
            for (let j = i + 1; j < roomSchedules.length; j++) {
                const schedule1 = roomSchedules[i];
                const schedule2 = roomSchedules[j];

                if (
                    isOverlap({
                        time1: schedule1.timeBlock,
                        time2: schedule2.timeBlock
                    })
                ) {
                    conflicts.push({
                        room: roomId,
                        conflict: [schedule1, schedule2]
                    });
                }
            }
        }
    }

    return conflicts;
};

const findProfessorConflicts = (schedules: any) => {
    // Step 1: Group by professor
    const profGroups = schedules.reduce((groups: any, schedule: any) => {
        const professorId = schedule.prof.professor_id;

        // Skip schedules with professor_id "PE ROOM" or invalid prof (if needed)
        if (professorId === 'GENDED PROF') {
            return groups;
        }

        if (!groups[professorId]) {
            groups[professorId] = [];
        }
        groups[professorId].push(schedule);

        return groups;
    }, {});

    // Step 2: Check for time conflicts within each professor group
    const conflicts = [];
    for (const professorId in profGroups) {
        const profSchedules = profGroups[professorId];

        // Compare each schedule with every other schedule for the same professor
        for (let i = 0; i < profSchedules.length; i++) {
            for (let j = i + 1; j < profSchedules.length; j++) {
                const schedule1 = profSchedules[i];
                const schedule2 = profSchedules[j];

                if (
                    isOverlap({
                        time1: schedule1.timeBlock,
                        time2: schedule2.timeBlock
                    })
                ) {
                    conflicts.push({
                        professor: schedule1.prof.name,
                        professorId,
                        conflict: [schedule1, schedule2]
                    });
                }
            }
        }
    }

    return conflicts;
};

// check if curriculum is finished

// check nice to have class gap constraint
// check nice to have class start constraint
// check nice to have class end constraint

// check nice to have prof constraint


export const evaluateFitnessScore = (chromosome: any) => {
    let score = 100;

    if (checkRoomConstraints(chromosome)) {
        score -= 10;
    }

    if (checkProfConstraints(chromosome)) {
        score -= 10;
    }

    return score;
};
