import { Client } from 'pg';
import { SCHOOL_DAYS } from './constants';

const DB_HOST = 'localhost';
const DB_PORT = 5432;
const DB_USER = 'postgres';
const DB_PASSWORD = 'password';
const DB_NAME = 'postgres';

export const client = new Client({
    host: DB_HOST,
    port: DB_PORT, // Use a default port if not specified
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
});

// Connect to PostgreSQL
client
    .connect()
    .then(() => {
        console.log('Connected to PostgreSQL database');
    })
    .catch((err) => {
        console.error('Connection error', err.stack);
    });

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

const checkYearLevelConstraints = async (chromosome: any) => {
    let CSYearGene = chromosome.find((gene: any) => gene.cs_1st)?.cs_1st;

    const queryCS =
        'SELECT restrictions FROM year_restrictions WHERE department = $1 AND year = $2';
    const res = await client.query(queryCS, ['CS', 1]);
    const yearLevelConstraintsCS1 = res.rows[0].restrictions;

    for (let i = 0; i < CSYearGene.length; i++) {
        let csSectionSched: any = Object.values(CSYearGene[i])[0];

        // console.log(yearLevelConstraintsCS1)

        for (const day in csSectionSched) {

            for (let j = 0; j < yearLevelConstraintsCS1[day].length; j++){

                if(!checkClassStart({
                    schedule: csSectionSched[day],
                    classStart: yearLevelConstraintsCS1[day][j].start
                })){
                    console.log('class start too early')
                    return false;
                }
                
                if(checkClassEnd({
                    schedule: csSectionSched[day],
                    classEnd: yearLevelConstraintsCS1[day][j].end
                })){
                    console.log('class end too late')
                    return false;
                }
            }
            
        }
    }
    
    let ITYearGene = chromosome.find((gene: any) => gene.it_1st)?.it_1st;
    
    const queryIT =
        'SELECT restrictions FROM year_restrictions WHERE department = $1 AND year = $2';
        const resIT = await client.query(queryIT, ['IT', 1]);
        const yearLevelConstraintsIT1 = resIT.rows[0].restrictions;
        
        for (let i = 0; i < ITYearGene.length; i++) {
            let itSectionSched: any = Object.values(ITYearGene[i])[0];
            
            for (const day in itSectionSched) {
                
                for (let j = 0; j < yearLevelConstraintsIT1[day].length; j++){
                    
                    if(!checkClassStart({
                        schedule: itSectionSched[day],
                        classStart: yearLevelConstraintsIT1[day][j].start
                    })){
                        console.log('class start too early')
                        return false;
                    }
                    
                    if(checkClassEnd({
                        schedule: itSectionSched[day],
                        classEnd: yearLevelConstraintsIT1[day][j].end
                    })){
                        console.log('class end too late')
                        return false;
                    }
                }
                
                
            }
        }
        
        let ISYearGene = chromosome.find((gene: any) => gene.it_1st)?.it_1st;

        const queryIS =
        'SELECT restrictions FROM year_restrictions WHERE department = $1 AND year = $2';
    const resIS = await client.query(queryIS, ['IS', 1]);
    const yearLevelConstraintsIS1 = resIS.rows[0].restrictions;
    
    for (let i = 0; i < ISYearGene.length; i++) {
        let isSectionSched: any = Object.values(ISYearGene[i])[0];
        
        for (const day in isSectionSched) {
            
            for (let j = 0; j < yearLevelConstraintsIS1[day].length; j++){
                
                if(!checkClassStart({
                    schedule: isSectionSched[day],
                    classStart: yearLevelConstraintsIS1[day][j].start
                })){
                    console.log('class start too early')
                    return false;
                }
                
                if(checkClassEnd({
                    schedule: isSectionSched[day],
                    classEnd: yearLevelConstraintsIS1[day][j].end
                })){
                    console.log('class end too late')
                    return false;
                }
            }
            
        }
    }

    return true;

}

const checkClassStart = ({
    schedule,
    classStart
}: {
    schedule: any;
    classStart: string;
}): boolean => {
    if (schedule.length <= 0) {
        return false;
    }
    // Sort schedule by start time (earliest first)
    const sortedSchedule = schedule.sort(
        (a: any, b: any) =>
            timeToMinutes(a.timeBlock.start) - timeToMinutes(b.timeBlock.start)
    );

    // Get the earliest start time
    const earliestStart = sortedSchedule[0].timeBlock.start;

    // Compare it with the provided classStart time
    if (timeToMinutes(earliestStart) < timeToMinutes(classStart)) {
        return true; // Earliest start is earlier than the provided class start time
    }

    return false; // Earliest start is not earlier
};

const checkClassEnd = ({
    schedule,
    classEnd
}: {
    schedule: any;
    classEnd: string;
}): boolean => {
    if (schedule.length <= 0) {
        return false;
    }
    const sortedSchedule = schedule.sort(
        (a: any, b: any) =>
            timeToMinutes(b.timeBlock.end) - timeToMinutes(a.timeBlock.end)
    );

    // Get the latest end time
    const latestEnd = sortedSchedule[0].timeBlock.end;

    // Compare it with the provided end time
    if (timeToMinutes(latestEnd) > timeToMinutes(classEnd)) {
        return true; // Latest end time exceeds the provided end time
    }

    return false; // Latest end time is within the provided limit
};

// check nice to have class gap constraint
const checkClassGapConstraint = async (chromosome: any) => {
    let hasConflict = false;
    let CSYearGene = chromosome.find((gene: any) => gene.cs_1st)?.cs_1st;

    // get min and max from db
    const queryCS =
        'SELECT class_gap_in_minutes_min, class_gap_in_minutes_max FROM class_gaps WHERE department = $1 AND year = $2';
    const res = await client.query(queryCS, ['CS', 1]);
    const classGapCS1st = res.rows[0];

    for (let i = 0; i < CSYearGene.length; i++) {
        let csSectionSched: any = Object.values(CSYearGene[i])[0];

        for (const day in csSectionSched) {
            hasConflict = checkClassGaps({
                schedule: csSectionSched[day],
                minGap: classGapCS1st.class_gap_in_minutes_min,
                maxGap: classGapCS1st.class_gap_in_minutes_max
            });
        }
    }

    if (hasConflict) {
        return hasConflict;
    }

    // IT
    let ITYearGene = chromosome.find((gene: any) => gene.it_1st)?.it_1st;

    // get min and max from db
    const queryIT =
        'SELECT class_gap_in_minutes_min, class_gap_in_minutes_max FROM class_gaps WHERE department = $1 AND year = $2';
    const resIT = await client.query(queryIT, ['IT', 1]);
    const classGapIT1st = resIT.rows[0];

    for (let i = 0; i < ITYearGene.length; i++) {
        let itSectionSched: any = Object.values(ITYearGene[i])[0];

        for (const day in itSectionSched) {
            hasConflict = checkClassGaps({
                schedule: itSectionSched[day],
                minGap: classGapIT1st.class_gap_in_minutes_min,
                maxGap: classGapIT1st.class_gap_in_minutes_max
            });
        }
    }

    if (hasConflict) {
        return hasConflict;
    }

    // IS
    let ISYearGene = chromosome.find((gene: any) => gene.it_1st)?.it_1st;

    // get min and max from db
    const queryIS =
        'SELECT class_gap_in_minutes_min, class_gap_in_minutes_max FROM class_gaps WHERE department = $1 AND year = $2';
    const resIS = await client.query(queryIS, ['IS', 1]);
    const classGapIS1st = resIS.rows[0];

    for (let i = 0; i < ISYearGene.length; i++) {
        let isSectionSched: any = Object.values(ISYearGene[i])[0];

        for (const day in isSectionSched) {
            hasConflict = checkClassGaps({
                schedule: isSectionSched[day],
                minGap: classGapIS1st.class_gap_in_minutes_min,
                maxGap: classGapIS1st.class_gap_in_minutes_max
            });
        }
    }

    return hasConflict;
};

const checkClassGaps = ({
    schedule,
    minGap,
    maxGap
}: {
    schedule: any;
    minGap: any;
    maxGap: any;
}): boolean => {
    // Sort schedule by start time
    schedule.sort(
        (a: any, b: any) =>
            timeToMinutes(a.timeBlock.start) - timeToMinutes(b.timeBlock.start)
    );

    // Check gaps between each consecutive class
    for (let i = 0; i < schedule.length - 1; i++) {
        const currentClass = schedule[i];
        const nextClass = schedule[i + 1];

        // Calculate the gap between the current class's end time and the next class's start time
        const endTime = timeToMinutes(currentClass.timeBlock.end);
        const startTime = timeToMinutes(nextClass.timeBlock.start);
        const gap = startTime - endTime;

        // Check if the gap is within the allowed range
        if (gap < minGap || gap > maxGap) {
            console.log(
                `Class gap between ${currentClass.course.subject_code} and ${nextClass.course.subject_code} is ${gap} minutes, which is outside the range.`
            );
            return true; // If any gap is out of range, return false
        }
    }

    // If all gaps are valid
    return false;
};

const timeToMinutes = (time: string): number => {
    const hours = parseInt(time.substring(0, 2), 10);
    const minutes = parseInt(time.substring(2), 10);
    return hours * 60 + minutes;
};

const checkCurriculumConstraints = async (chromosome: any) => {
    let hasConflict = false;
    let semCurr = await getCoursesAndTotalUnitsPerCurriculum(1);

    let CSYearGene = chromosome.find((gene: any) => gene.cs_1st)?.cs_1st;
    for (let i = 0; i < CSYearGene.length; i++) {
        const totalUnitsInSchedule: any = {};
        let csSectionSched: any = Object.values(CSYearGene[i])[0];

        // Iterate through the schedule for each day (M, T, W, TH, F, S)
        for (const day in csSectionSched) {
            csSectionSched[day].forEach((scheduleItem: any) => {
                const { subject_code, units_per_class } = scheduleItem.course;
                if (totalUnitsInSchedule[subject_code]) {
                    totalUnitsInSchedule[subject_code] += units_per_class;
                } else {
                    totalUnitsInSchedule[subject_code] = units_per_class;
                }
            });
        }

        const csCurr = semCurr.find((item) => item['1CS']); // Find the curriculum for '1CS'

        if (csCurr) {
            csCurr['1CS'].forEach((course: any) => {
                const { subject_code, total_units } = course;
                const totalUnitsScheduled =
                    totalUnitsInSchedule[subject_code] ?? 0;

                // Check if the scheduled units match the curriculum units
                if (totalUnitsScheduled !== total_units) {
                    console.log(`Mismatch for ${subject_code}:`);
                    console.log(
                        `Scheduled units: ${totalUnitsScheduled}, Expected units: ${total_units}`
                    );
                    hasConflict = true;
                }
            });
        }
    }

    let ITYearGene = chromosome.find((gene: any) => gene.it_1st)?.it_1st;
    for (let i = 0; i < ITYearGene.length; i++) {
        const totalUnitsInSchedule: any = {};
        let itSectionSched: any = Object.values(ITYearGene[i])[0];

        // Iterate through the schedule for each day (M, T, W, TH, F, S)
        for (const day in itSectionSched) {
            itSectionSched[day].forEach((scheduleItem: any) => {
                const { subject_code, units_per_class } = scheduleItem.course;
                if (totalUnitsInSchedule[subject_code]) {
                    totalUnitsInSchedule[subject_code] += units_per_class;
                } else {
                    totalUnitsInSchedule[subject_code] = units_per_class;
                }
            });
        }

        const itCurr = semCurr.find((item) => item['1IT']); // Find the curriculum for '1CS'

        if (itCurr) {
            itCurr['1IT'].forEach((course: any) => {
                const { subject_code, total_units } = course;
                const totalUnitsScheduled =
                    totalUnitsInSchedule[subject_code] ?? 0;

                // Check if the scheduled units match the curriculum units
                if (totalUnitsScheduled !== total_units) {
                    console.log(`Mismatch for ${subject_code}:`);
                    console.log(
                        `Scheduled units: ${totalUnitsScheduled}, Expected units: ${total_units}`
                    );
                    hasConflict = true;
                }
            });
        }
    }

    let ISYearGene = chromosome.find((gene: any) => gene.is_1st)?.is_1st;
    for (let i = 0; i < ISYearGene.length; i++) {
        const totalUnitsInSchedule: any = {};
        let isSectionSched: any = Object.values(ISYearGene[i])[0];

        // Iterate through the schedule for each day (M, T, W, TH, F, S)
        for (const day in isSectionSched) {
            isSectionSched[day].forEach((scheduleItem: any) => {
                const { subject_code, units_per_class } = scheduleItem.course;
                if (totalUnitsInSchedule[subject_code]) {
                    totalUnitsInSchedule[subject_code] += units_per_class;
                } else {
                    totalUnitsInSchedule[subject_code] = units_per_class;
                }
            });
        }

        const isCurr = semCurr.find((item) => item['1IS']); // Find the curriculum for '1CS'

        if (isCurr) {
            isCurr['1IS'].forEach((course: any) => {
                const { subject_code, total_units } = course;
                const totalUnitsScheduled =
                    totalUnitsInSchedule[subject_code] ?? 0;

                // Check if the scheduled units match the curriculum units
                if (totalUnitsScheduled !== total_units) {
                    console.log(`Mismatch for ${subject_code}:`);
                    console.log(
                        `Scheduled units: ${totalUnitsScheduled}, Expected units: ${total_units}`
                    );
                    hasConflict = true;
                }
            });
        }
    }

    return !hasConflict;
};

const getCoursesAndTotalUnitsPerCurriculum = async (semester: number) => {
    let coursesAndUnitsPerCurr = [];

    const query = 'SELECT * FROM curriculum WHERE semester = $1';
    const res = await client.query(query, [semester]);
    const curriculums = res.rows;

    for (let i = 0; i < curriculums.length; i++) {
        let curr = curriculums[i];

        const query2 =
            'SELECT subject_code, total_units FROM courses WHERE subject_code = ANY($1)';
        const res2 = await client.query(query2, [curr.courses]);

        let key = `${curr.year}${curr.department}`;

        coursesAndUnitsPerCurr.push({
            [key]: res2.rows
        });
    }

    return coursesAndUnitsPerCurr;
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
};

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

// get constraints from db
const checkProfRequestConstraints = async (chromosome: any) => {
    let CSYearGene = chromosome.find((gene: any) => gene.cs_1st)?.cs_1st;
    for (let i = 0; i < CSYearGene.length; i++) {
        let csSectionSched: any = Object.values(CSYearGene[i])[0];

        // Iterate through the schedule for each day (M, T, W, TH, F, S)
        for (const day in csSectionSched) {
            for (const scheduleItem of csSectionSched[day]) {
                if (scheduleItem.course.category === 'gened') {
                    continue;
                } else {
                    const query =
                        'SELECT restrictions FROM professors WHERE professor_id = $1';
                    const res = await client.query(query, [
                        scheduleItem.prof.professor_id
                    ]);
                    const profReq = res.rows[0].restrictions;

                    for (const res of profReq[day]) {
                        if (
                            isOverlap({
                                time1: scheduleItem.timeBlock,
                                time2: res
                            })
                        ) {
                            console.log(`has conflict with prof request: ${scheduleItem.prof.name}`)
                            return false; // Conflict found, exit immediately
                        }
                    }
                }
            }
        }
    }

    let ITYearGene = chromosome.find((gene: any) => gene.it_1st)?.it_1st;
    for (let i = 0; i < ITYearGene.length; i++) {
        let itSectionSched: any = Object.values(ITYearGene[i])[0];

        // Iterate through the schedule for each day (M, T, W, TH, F, S)
        for (const day in itSectionSched) {
            for (const scheduleItem of itSectionSched[day]) {
                if (scheduleItem.course.category === 'gened') {
                    continue;
                } else {
                    const query =
                        'SELECT restrictions FROM professors WHERE professor_id = $1';
                    const res = await client.query(query, [
                        scheduleItem.prof.professor_id
                    ]);                    
                    const profReq = res.rows[0].restrictions;

                    for (const res of profReq[day]) {
                        if (
                            isOverlap({
                                time1: scheduleItem.timeBlock,
                                time2: res
                            })
                        ) {
                            console.log(`has conflict with prof request: ${scheduleItem.prof.name}`)
                            return false; // Conflict found, exit immediately
                        }
                    }
                }
            }
        }
    }

    let ISYearGene = chromosome.find((gene: any) => gene.is_1st)?.is_1st;
    for (let i = 0; i < ISYearGene.length; i++) {
        let isSectionSched: any = Object.values(ISYearGene[i])[0];

        // Iterate through the schedule for each day (M, T, W, TH, F, S)
        for (const day in isSectionSched) {
            for (const scheduleItem of isSectionSched[day]) {
                if (scheduleItem.course.category === 'gened') {
                    continue;
                } else {
                    const query =
                        'SELECT restrictions FROM professors WHERE professor_id = $1';
                    const res = await client.query(query, [
                        scheduleItem.prof.professor_id
                    ]);
                    const profReq = res.rows[0].restrictions;

                    for (const res of profReq[day]) {
                        if (
                            isOverlap({
                                time1: scheduleItem.timeBlock,
                                time2: res
                            })
                        ) {
                            console.log(`has conflict with prof request: ${scheduleItem.prof.name}`)
                            return false; // Conflict found, exit immediately
                        }
                    }
                }
            }
        }
    }

    return true;
};

// check nice to have prof constraint

// kahit one constraint lng per cat isang minus lng
export const evaluateFitnessScore = async (chromosome: any) => {
    let score = 100;

    // hard conflicts
    if (checkRoomConstraints(chromosome)) {
        score -= 10;
    }

    if (checkProfConstraints(chromosome)) {
        score -= 10;
    }

    let currConflicts = await checkCurriculumConstraints(chromosome);
    if (!currConflicts) {
        score -= 10;
    }

    // medium conflicts
    let classGapConflicts = await checkClassGapConstraint(chromosome);
    if (!classGapConflicts) {
        score -= 5;
    }
    
    let yearLevelConflicts = await checkYearLevelConstraints(chromosome);
    if (!yearLevelConflicts) {
        score -= 5;
    }

    let profRequestConflicts = await checkProfRequestConstraints(chromosome);
    if (!profRequestConflicts) {
        score -= 5;
    }

    return score;
};
