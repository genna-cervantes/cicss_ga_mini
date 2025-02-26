// generate pero timeblocks and courses lng
//   - eto ung iccross over multiple times para marami like possible something
//   - tapos saka mag aassign sa baba

import { spec } from 'node:test/reporters';
import { Client } from 'pg';
import { SCHOOL_DAYS } from './constants';

// assign rooms while checking conflict
//   - add sa room sched tapos don mag check ng conflict
// assign tas while checking conflict
//   - add sa tas shed tapos don mag check ng conflict

// - new obj ung may kasama na tas nd room
// - ung top obj na timeblocks lng ung innext crossover gen

// - so loop thru the generated shit and then assign and then evaluate
// - check ung top tapos keep
// - tapos loop again sa crossover assign evaluate

// bali pag ka enter ng section count saka mag gegenerate ng section names
// tapos maylalabas na forms para malaman what specialziation ng bawat section
// tapos ayun ung papasok sa generate function
// sectionSpecializations = {
//     csa: 'core',
//     csb: 'gamdev',
//     csc: 'datasci',
//     csd: 'none' // dapat sa front end may tick box lng to check na wala pang specializations at this level para lahat matic none
// }

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

export const runGAV3 = async () => {
    // generate 1st year

    let classSchedule: any = {}
    let schedulesFirst = await generateV3({
        department: 'CS',
        year: 1,
        semester: 2,
        sectionSpecializations: {
            CSA: 'none',
            CSB: 'none',
            CSC: 'none',
            CSD: 'none'
        }
    });
    classSchedule[1] = schedulesFirst;

    let schedulesSecond = await generateV3({
        department: 'CS',
        year: 2,
        semester: 2,
        sectionSpecializations: {
            CSA: 'none',
            CSB: 'none',
            CSC: 'none',
            CSD: 'none'
        }
    });
    classSchedule[2] = schedulesSecond;

    let schedulesThird = await generateV3({
        department: 'CS',
        year: 3,
        semester: 2,
        sectionSpecializations: {
            CSA: 'none',
            CSB: 'none',
            CSC: 'none',
            CSD: 'none'
        }
    });
    classSchedule[3] = schedulesThird;

    let schedulesFourth = await generateV3({
        department: 'CS',
        year: 4,
        semester: 2,
        sectionSpecializations: {
            CSA: 'none',
            CSB: 'none',
            CSC: 'none',
            CSD: 'none'
        }
    });
    classSchedule[4] = schedulesFourth;

    let roomSchedule = {};

    await assignRooms({ classSchedules: classSchedule, roomSchedule, department: 'CS' });

    return {
        classSchedules: classSchedule,
        roomSchedules: roomSchedule
    }
    return true;
};

const generateV3 = async ({
    department,
    year,
    semester,
    sectionSpecializations
}: {
    department: string;
    year: number;
    semester: number;
    sectionSpecializations: any;
}) => {
    let specializationsAndSections: any = {};
    let specializationsAndCurriculum: any = {};

    console.log('year', year)

    // group sectionSpecializations by specialization not section
    let sectionKeys = Object.keys(sectionSpecializations);
    for (let i = 0; i < sectionKeys.length; i++) {
        let specialization = sectionSpecializations[sectionKeys[i]];

        if (specialization === 'none') {
            specializationsAndSections['none'] = [...sectionKeys];
            break;
        }

        if (!specializationsAndSections[specialization]) {
            specializationsAndSections[specialization] = [];
        }

        specializationsAndSections[specialization].push(sectionKeys[i]);
    }

    // get curriculum per year per department per specialization
    let specializations = Object.keys(specializationsAndSections);

    if (specializations.length > 0 && specializations[0] !== 'none') {
        for (let i = 0; i < specializations.length; i++) {
            const query =
                'SELECT courses FROM curriculum WHERE department = $1 AND year = $2 AND specialization = $3';
            const res = await client.query(query, [
                department,
                year,
                specializations[i]
            ]);
            const curriculum = res.rows[0].courses;

            specializationsAndCurriculum[specializations[i]] = curriculum;
        }
    } else {
        const query =
            'SELECT courses FROM curriculum WHERE department = $1 AND year = $2 AND semester = $3';
        const res = await client.query(query, [department, year, semester]);
        const curriculum = res.rows[0].courses;

        specializationsAndCurriculum['none'] = curriculum;
    }

    let schedules: any = {};
    let sectionChecker = [];
    let returnObj: any = {};

    loop1: for (let i = 0; i < specializations.length; i++) {
        let sections = specializationsAndSections[specializations[i]];

        loop4: for (let j = 0; j < sections.length; ) {
            // console.log('sections', sections)
            
            let specCurriculum = [
                ...specializationsAndCurriculum[specializations[i]]
            ];
            
            let section = sections[j];

            let availableDays = await getAvailableDays({ year, department });
            let maxDays = await getMaxDays({ year, department });
            let availableTime = await getAvailableTime({ year, department });

            let requiredCourses = await getRequiredCourses(specCurriculum);
            let daySched: any = [];

            // console.log(section);
            // console.log(specializationsAndCurriculum[specializations[i]]);
            // console.log(availableDays);
            // console.log(maxDays);
            // console.log(availableTime);
            // console.log(requiredCourses);

            // loop thru the available days and max days

            let consecutiveHours = 0;

            loop2: for (let k = 0; k < SCHOOL_DAYS.length; k++) {

                // console.log('school days', SCHOOL_DAYS)

                let schoolDay = SCHOOL_DAYS[k];
                daySched = [];

                let startTime = getStartAndEndTime({
                    startRestriction: availableTime[SCHOOL_DAYS[k]][0]?.start,
                    endRestriction: availableTime[SCHOOL_DAYS[k]][0]?.end
                }).start; // should change
                let maxEndTime = getStartAndEndTime({
                    startRestriction: availableTime[SCHOOL_DAYS[k]][0]?.start,
                    endRestriction: availableTime[SCHOOL_DAYS[k]][0]?.end
                }).end; // should change

                // console.log('school day', schoolDay);
                // console.log('current day sched', daySched);
                // console.log('required courses left: ', requiredCourses);

                // console.log('start', startTime);
                // console.log('max end time', maxEndTime);
                let consecTries = 0;
                let tries = 0;

                loop3: for (
                    let currentTime = startTime;
                    currentTime < maxEndTime;
                ) {
                    if (tries >= 10) {
                        // console.log('too many tries');
                        break loop3;
                    }

                    tries++;
                    // console.log('(re)starting loop');
                    // console.log('current time: ', currentTime);
                    // console.log('max end time: ', maxEndTime);
                    // console.log('consecutive hours: ', consecutiveHours);

                    // add break if 3 consecutive hours na
                    if (consecutiveHours >= 3) {
                        // console.log('consecutive hours hit adding break time');

                        consecutiveHours = 0;
                        let breakTimeProbability = Math.random();
                        let breakTime;

                        let randomBreakTime = 0;

                        // 1hr 1:30 - 50%
                        // 1hr 30 - 2hr 30 - 30%
                        // 2hr 30 3hr 30 - 15%
                        // 4 hr - 5%

                        if (
                            breakTimeProbability > 0 &&
                            breakTimeProbability <= 0.5
                        ) {
                            randomBreakTime =
                                Math.floor(Math.random() * 60) + 30; // in minutes minimum 30mins max 4 hrs
                        } else if (
                            breakTimeProbability > 0.5 &&
                            breakTimeProbability <= 0.8
                        ) {
                            randomBreakTime =
                                Math.floor(Math.random() * 120) + 90; // in minutes minimum 30mins max 4 hrs
                        } else if (
                            breakTimeProbability > 0.8 &&
                            breakTimeProbability <= 0.95
                        ) {
                            randomBreakTime =
                                Math.floor(Math.random() * 180) + 150; // in minutes minimum 30mins max 4 hrs
                        } else if (
                            breakTimeProbability > 0.95 &&
                            breakTimeProbability <= 1
                        ) {
                            randomBreakTime = Math.floor(Math.random() * 240); // in minutes minimum 30mins max 4 hrs
                        }

                        if (randomBreakTime >= 30 && randomBreakTime <= 59) {
                            breakTime = 30;
                        } else if (
                            randomBreakTime >= 60 &&
                            randomBreakTime <= 89
                        ) {
                            breakTime = 60;
                        } else if (
                            randomBreakTime >= 90 &&
                            randomBreakTime <= 119
                        ) {
                            breakTime = 90;
                        } else if (
                            randomBreakTime >= 120 &&
                            randomBreakTime <= 149
                        ) {
                            breakTime = 120;
                        } else if (
                            randomBreakTime >= 150 &&
                            randomBreakTime <= 179
                        ) {
                            breakTime = 150;
                        } else if (
                            randomBreakTime >= 180 &&
                            randomBreakTime <= 209
                        ) {
                            breakTime = 180;
                        } else if (
                            randomBreakTime >= 210 &&
                            randomBreakTime <= 239
                        ) {
                            breakTime = 210;
                        } else {
                            breakTime = 240;
                        }

                        // console.log(
                        //     'random break time in minutes: ',
                        //     breakTime
                        // );
                        let militaryTime =
                            convertMinutesToMilitaryTime(breakTime);
                        currentTime = addMilitaryTimes(currentTime, militaryTime);

                        // console.log(
                        //     'break time in military time: ',
                        //     militaryTime
                        // );
                        // console.log('new current time: ', currentTime);
                    }

                    if (specCurriculum.length <= 0) {
                        // console.log('assigned na lahat ng courses');
                        sectionChecker.push(section);

                        // console.log(section);
                        // console.log(schoolDay);
                        // console.log(daySched);

                        if (!schedules[section]) {
                            schedules[section] = {};
                        }

                        schedules[section][schoolDay] = daySched;
                        break loop2;
                    }

                    let randomCourse =
                        specCurriculum[
                            Math.floor(Math.random() * specCurriculum.length)
                        ];

                    // console.log('getting random course: ', randomCourse);
                    let courseDetails = await getCourseDetails(randomCourse);

                    // check baka complete na sa course na un
                    if (requiredCourses[courseDetails.subjectCode] <= 0) {
                        // console.log('puno na course na toh');
                        let courseIndex = specCurriculum.indexOf(
                            courseDetails.subjectCode
                        );
                        specCurriculum.splice(courseIndex, 1);
                        continue loop3;
                    }

                    // console.log('getting end time');
                    let endTime = getEndTime({
                        startTime: currentTime,
                        type: courseDetails.type,
                        unitsPerClass: courseDetails.unitsPerClass
                    });
                    // console.log(
                    //     'course units per class: ',
                    //     courseDetails.unitsPerClass
                    // );
                    // console.log('course type: ', courseDetails.type);
                    // console.log('end time: ', endTime);
                    // console.log('stop end time');

                    // check ung sa pe add 2 hours before and after
                    let endTimeCopy = endTime;
                    if (courseDetails.subjectCode.startsWith('PATHFIT')) {
                        // ipplot ung pe dapat 2 hours more so currentTime + 2 hours na -> pag naadd n lahat
                        // tapos add ulit 2 hrs break after on top of the actual end time

                        // check if add ng 4 hours if start/end ng class or 6 hours pag in between siya
                        if (
                            currentTime <= 800 ||
                            currentTime >= subtractMilitaryTime(maxEndTime, 100)
                        ) {
                            endTimeCopy = addMilitaryTimes(currentTime, 400); // 4 hours
                        } else {
                            endTimeCopy = addMilitaryTimes(currentTime, 600); // 6 hours
                        }
                    }

                    // check if pwede pa sa end time
                    if (
                        addMilitaryTimes(currentTime, subtractMilitaryTime(endTimeCopy, currentTime)) >
                        maxEndTime
                    ) {
                        // console.log('class too long');
                        // console.log('current time: ', currentTime);
                        // console.log('end time: ', endTimeCopy);
                        // console.log('max end time: ', maxEndTime);

                        continue loop3;
                    }

                    // add function na if ung iaadd is more than 3 hours aabot continue
                    // add na agad ng break time if ndi aabot ??
                    // try ng ibang ano
                    // tracker for trying sa loop ng consec toh tapos if more than 10 tries na gawin nlng ung nasa taas
                    if (
                        consecutiveHours +
                            convertMilitaryTimeToMinutes(
                                subtractMilitaryTime(endTimeCopy, currentTime)
                            ) /
                                60 >
                            3 &&
                        !courseDetails.subjectCode.startsWith('PATHFIT')
                    ) {
                        // console.log('consecutive hours restriction hit');
                        // console.log('consecutive hours: ', consecutiveHours);
                        // console.log(
                        //     'hours to add: ',
                        //     convertMilitaryTimeToMinutes(
                        //         endTimeCopy - currentTime
                        //     ) / 60
                        // );

                        consecTries++;
                        tries--; // dont count the tries for this

                        if (consecTries >= 10) {
                            consecutiveHours = 3;
                            consecTries = 0;
                            continue loop3;
                        }

                        // try iba
                        continue loop3;
                    }

                    // check if pwede ba ung course na toh at this time if not tuloy lng
                    let restrictions =
                        courseDetails.restrictions[SCHOOL_DAYS[k]];
                    for (let n = 0; n < restrictions.length; n++) {
                        // console.log('checking with restrictions');
                        if (
                            currentTime >= restrictions[n].start &&
                            currentTime < restrictions[n].end
                        ) {
                            // console.log('restriction violated');
                            // console.log('current time: ', currentTime);
                            // console.log(
                            //     'restriction start time: ',
                            //     restrictions[n].start
                            // );
                            // console.log(
                            //     'restriction end time: ',
                            //     restrictions[n].end
                            // );

                            continue loop3;
                        }

                        if (
                            endTimeCopy > restrictions[n].start &&
                            (currentTime <= restrictions[n].start ||
                                currentTime < restrictions[n].end)
                        ) {
                            // console.log('restriction violated');
                            // console.log('current time: ', currentTime);
                            // console.log(
                            //     'restriction start time: ',
                            //     restrictions[n].start
                            // );
                            // console.log(
                            //     'restriction end time: ',
                            //     restrictions[n].end
                            // );

                            continue loop3;
                        }
                    }

                    // pwede ung course so go assign

                    let schedBlock: any = {};

                    let timeBlock = {
                        start: currentTime.toString(),
                        end: endTime.toString()
                    };

                    if (courseDetails.subjectCode.startsWith('PATHFIT')) {
                        // if wala pang assigned before this dont add before pero pag meron na matic add kahit anong oras p yan
                        // tapos matic din na may 2 hours after this
                        if (daySched.length > 0) {
                            timeBlock.start = addMilitaryTimes(
                                currentTime,
                                200
                            ).toString();
                            timeBlock.end = addMilitaryTimes(
                                endTime,
                                200
                            ).toString();
                        }
                    }

                    schedBlock = {
                        course: courseDetails, // courseDetails.subjectCode
                        timeBlock
                    };

                    // console.log('generated sched block: ', schedBlock);

                    daySched.push(schedBlock);
                    // console.log('new day sched: ', daySched);

                    // add the units per class to the current time
                    // add the units per class to the consecutive hours
                    // console.log('end time: ', endTime);
                    // console.log('current time: ', currentTime);

                    if (courseDetails.subjectCode.startsWith('PATHFIT')) {
                        // console.log(
                        //     'changing current time and consec hours according to pe'
                        // );
                        // current time plus 2
                        if (daySched.length > 0) {
                            currentTime = addMilitaryTimes(currentTime, 600);
                        } else {
                            currentTime = addMilitaryTimes(currentTime, 400);
                            consecutiveHours = 0;
                        }
                    } else {
                        let totalCourseHoursAssigned = subtractMilitaryTime(
                            endTime,
                            currentTime
                        );
                        // console.log(
                        //     'total course hours assigned: ',
                        //     totalCourseHoursAssigned
                        // );
                        currentTime = addMilitaryTimes(
                            currentTime,
                            totalCourseHoursAssigned
                        );
                        // console.log(
                        //     'consecutive hours to add: ',
                        //     convertMilitaryTimeToMinutes(
                        //         totalCourseHoursAssigned
                        //     ) / 60
                        // );
                        consecutiveHours +=
                            convertMilitaryTimeToMinutes(
                                totalCourseHoursAssigned
                            ) / 60;
                    }

                    // minus the units
                    requiredCourses[courseDetails.subjectCode] -=
                    courseDetails.unitsPerClass;
                    
                    // console.log('new current time: ', currentTime);
                    // console.log('new consecutive hours: ', consecutiveHours);
                }

                // console.log('done assigning courses for one day');

                // console.log(section);
                // console.log(schoolDay);
                // console.log(daySched);
                // console.log(requiredCourses)

                if (!schedules[section]) {
                    schedules[section] = {};
                }

                schedules[section][schoolDay] = daySched;
            }

            // check if 0 lahat nung sa required courses
            // if yes we push that section sched to the return body
            // and remove that section from the loop
            // else we just continue

            let requiredCoursesKeys = Object.keys(requiredCourses);
            for (let k = 0; k < requiredCoursesKeys.length; k++) {
                if (requiredCourses[requiredCoursesKeys[k]] > 0) {
                    schedules[section] = {};
                    j = 0;
                    continue loop4;
                }
            }
            sections.splice(j, 1);
            returnObj[section] = schedules[section];

            j = 0;
            continue loop4;
        }
    }

    // console.log('section checker: ', sectionChecker);

    return returnObj;
    // return schedules;

    // note lng na ung crossover is per section para walang conflict na mangyayari

    // may obje n mag ttrack ng lahat ng schedules na pumasa (applied lahat ng courses)
    // {CSA: [], CSB: []} - somethign like that

    // mag mmix and match sa mga schedule don para makagawa ng multiple schedules - or wag n kasi eto na ung cross over eh
    // okay imbes n ganyan mag ppush nlng don tapos irermove sa loop if may laman na tapos irereturn kapag 1 na laman ng lahat kasi nga eto na ung cross over

    //
};

// may conflict pa rin 
const assignRooms = async ({
    classSchedules,
    roomSchedule,
    department
}: {
    classSchedules: any;
    roomSchedule: any;
    department: string;
}) => {
    // loop thru sections in generate
    let classScheduleKeys = Object.keys(classSchedules);
    for (let i = 0; i < classScheduleKeys.length; i++) {
        let yearSched = classSchedules[classScheduleKeys[i]];

        let yearSchedKeys = Object.keys(yearSched);
        for (let j = 0; j < yearSchedKeys.length; j++){
            let classSched = yearSched[yearSchedKeys[j]]

            // loop thru schooldays
            for (let k = 0; k < SCHOOL_DAYS.length; k++) {
                let daySched = classSched[SCHOOL_DAYS[k]];
    
                // loop thru day sched
                for (let m = 0; m < (daySched?.length ?? 0); m++) {
                    let schedBlock = daySched[m];
    
                    let course = schedBlock.course;
                    let timeBlock = schedBlock.timeBlock;
    
                    if (course.subjectCode.startsWith('PATHFIT')){
                        schedBlock.room = 'PE ROOM';
                        continue;
                    }
    
                    // assign room
                    let room = await findRoomForCourse({
                        course: course.subjectCode,
                        courseType: course.type,
                        roomSchedule,
                        specificRoomAssignment: course.specificRoomAssignment,
                        department,
                        timeBlock,
                        schoolDay: SCHOOL_DAYS[j]
                    });
                    
                    schedBlock.room = room;
                    if (!roomSchedule?.[room]) {
                        roomSchedule[room] = {
                            M: [],
                            T: [],
                            W: [],
                            TH: [],
                            F: [],
                            S: [],
                        };
                    }
                    roomSchedule[room][SCHOOL_DAYS[j]].push({ course: course.subjectCode, timeBlock });
                }
            }
        }

    }
    // before adding check if may conflict
    // if wala add if meron check ung next if pwede
    // loop until makakuha ng pwede
    // if wala pwede set as null tapos move on sa next sched
    
    // return class sched n may rooms na
};

// add to room sched and class sched
const findRoomForCourse = async ({
    course,
    courseType,
    roomSchedule,
    specificRoomAssignment,
    department,
    timeBlock,
    schoolDay
}: {
    course: string;
    courseType: string;
    roomSchedule: any;
    specificRoomAssignment: any;
    department: string;
    timeBlock: any;
    schoolDay: string;
}) => {
    if (specificRoomAssignment) {
        // check kung pwede sa room na un pero dapat oo lolz
    }

    const query =
        'SELECT room_id FROM rooms WHERE type = $1 AND main_department = $2';
    const res = await client.query(query, [courseType, department]);
    const availableRooms = res.rows;

    // loop thru available rooms
    for (let i = 0; i < availableRooms.length; i++) {
        let prospectRoom = availableRooms[i];

        // check if pwede sa room schedule
        let roomAvailability = checkRoomAvailability({
            roomSchedule,
            timeBlock,
            room: prospectRoom.room_id,
            schoolDay
        });

        if (!roomAvailability) {
            continue;
        }
        
        return prospectRoom.room_id
    }

    // wala pa narereturn ibig sabihin wala pa
    const query2 =
        'SELECT room_id FROM rooms WHERE type != $1 AND main_department = $2';
    const res2 = await client.query(query2, [courseType, department]);
    const availableRooms2 = res2.rows;

     // loop thru available rooms
     for (let i = 0; i < availableRooms2.length; i++) {
        let prospectRoom = availableRooms2[i];

        // check if pwede sa room schedule
        let roomAvailability = checkRoomAvailability({
            roomSchedule,
            timeBlock,
            room: prospectRoom.room_id,
            schoolDay
        });

        if (!roomAvailability) {
            continue;
        }
        
        return prospectRoom.room_id
    }
    
    // wala na talaga kuha na sa ibang department ng kahit ano
    const query3 =
        'SELECT room_id FROM rooms WHERE main_department != $1';
    const res3 = await client.query(query3, [department]);
    const availableRooms3 = res3.rows;

     // loop thru available rooms
     for (let i = 0; i < availableRooms3.length; i++) {
        let prospectRoom = availableRooms3[i];

        // check if pwede sa room schedule
        let roomAvailability = checkRoomAvailability({
            roomSchedule,
            timeBlock,
            room: prospectRoom.room_id,
            schoolDay
        });

        if (!roomAvailability) {
            continue;
        }
        
        return prospectRoom.room_id
    }
    
    return null;
};

// roomSChedule = {
//     [roomid] = {
//         M: daysched
//     }
// }
const checkRoomAvailability = ({
    roomSchedule,
    timeBlock,
    room,
    schoolDay
}: {
    roomSchedule: any;
    timeBlock: any;
    room: string;
    schoolDay: string;
}) => {
    let specRoomDaySched = roomSchedule?.[room]?.[schoolDay];

    if (!specRoomDaySched) {
        return true;
    }

    for (let i = 0; i < specRoomDaySched.length; i++) {
        let roomTimeBlock = specRoomDaySched[i].timeBlock;

        if (
            (parseInt(timeBlock.start) >= parseInt(roomTimeBlock.start) &&
                parseInt(timeBlock.start) < parseInt(roomTimeBlock.end)) ||
            (parseInt(timeBlock.end) > parseInt(roomTimeBlock.start) &&
                parseInt(timeBlock.end) <= parseInt(roomTimeBlock.end)) ||
            (parseInt(timeBlock.start) <= parseInt(roomTimeBlock.start) &&
                parseInt(timeBlock.end) >= parseInt(roomTimeBlock.end)) ||
            (parseInt(timeBlock.start) >= parseInt(roomTimeBlock.start) &&
                parseInt(timeBlock.end) <= parseInt(roomTimeBlock.end))
        ) {
            return false;
        } //1200 1500 //1230 1400 
    }

    return true;
};

// 1 - 2
const subtractMilitaryTime = (militaryTime1: number, militaryTime2: number) => {
    // console.log('subtracting military time');
    let roundedMilitaryTimeHours1 = Math.ceil(militaryTime1 / 100) * 100;
    let militaryTime1Minutes = militaryTime1 % 100;

    // console.log('rounded military hours 1: ', roundedMilitaryTimeHours1);
    // console.log('military minutes 1: ', militaryTime1Minutes);

    // subtract hours muna
    let roundedMilitaryTimeHours2 = Math.ceil(militaryTime2 / 100) * 100;
    let militaryTime2Minutes = militaryTime2 % 100;

    // console.log('rounded military hours 2: ', roundedMilitaryTimeHours1);
    // console.log('military minutes 2: ', militaryTime2Minutes);

    let subtractedHours = roundedMilitaryTimeHours1 - roundedMilitaryTimeHours2;
    let subtractedMinutes = militaryTime1Minutes - militaryTime2Minutes;

    // console.log('subtracted hours: ', subtractedHours);
    // console.log('subtracted minutes: ', subtractedMinutes);

    // console.log('final: ', subtractedHours + subtractedMinutes);

    if (subtractedMinutes > 0) {
        return subtractedHours - 100 + subtractedMinutes;
    }
    return subtractedHours + Math.abs(subtractedMinutes);
};

const addMilitaryTimes = (militaryTime1: number, militaryTime2: number) => {
    let combinedTime = militaryTime1 + militaryTime2;

    let combinedTimeHours = Math.floor(combinedTime / 100) * 100;
    let combinedTimeMinutes = combinedTime % 100;

    if (combinedTimeMinutes >= 60) {
        let hoursToAdd = Math.floor(combinedTimeMinutes / 60) * 100;
        let minutesLeft = combinedTimeMinutes % 60;

        return combinedTimeHours + hoursToAdd + minutesLeft;
    }

    return combinedTimeHours + combinedTimeMinutes;
};

const getEndTime = ({
    startTime,
    unitsPerClass,
    type
}: {
    startTime: number;
    unitsPerClass: number;
    type: string;
}) => {
    let unitsInMinutes = 1;

    if (type === 'lec') {
        unitsInMinutes = unitsPerClass * 60;
    } else if (type === 'lab') {
        unitsInMinutes = unitsPerClass * 60 * 3;
    }

    let unitsInMilitaryTime = convertMinutesToMilitaryTime(unitsInMinutes);

    return addMilitaryTimes(startTime, unitsInMilitaryTime);
    // let endTime = startTime + unitsInMilitaryTime;

    // let endTimeHours = Math.floor(endTime / 100) * 100;
    // let endTimeMinutes = endTime % 100

    // if (endTimeMinutes >= 60){
    //     let hoursToAdd = Math.floor(endTimeMinutes / 60) * 100
    //     let minutesLeft = endTimeMinutes % 60;

    //     return endTimeHours + hoursToAdd + minutesLeft
    // }

    // return endTimeHours + endTimeMinutes;
};

const getStartAndEndTime = ({
    startRestriction,
    endRestriction
}: {
    startRestriction: number;
    endRestriction: number;
}) => {
    let standardAvailableTime = {
        start: 700,
        end: 2100
    };

    if (!startRestriction && !endRestriction){
        return standardAvailableTime;
    }

    if (startRestriction == standardAvailableTime.start) {
        standardAvailableTime.start = endRestriction;
    }

    if (startRestriction < standardAvailableTime.end) {
        standardAvailableTime.end = startRestriction;
    }

    return standardAvailableTime;
};

const convertMilitaryTimeToMinutes = (totalMilitaryHours: number) => {
    // console.log(totalMilitaryHours);
    let hours = Math.floor(totalMilitaryHours / 100) * 60;
    let minutes = totalMilitaryHours % 100;
    return hours + minutes;
};

// 260
const convertMinutesToMilitaryTime = (totalMinutes: number) => {
    let hours = Math.floor(totalMinutes / 60) * 100;
    let minutes = totalMinutes % 60;

    return hours + minutes;
};

const getCourseDetails = async (subjectCode: string) => {
    const query = 'SELECT * FROM courses WHERE subject_code = $1';
    const res = await client.query(query, [subjectCode]);
    const courseDetails = {
        subjectCode: res.rows[0].subject_code,
        unitsPerClass: res.rows[0].units_per_class,
        type: res.rows[0].type,
        category: res.rows[0].category,
        restrictions: res.rows[0].restrictions,
        totalUnits: res.rows[0].total_units,
        specificRoomAssignment: res.rows[0].specific_room_assignment
    };

    return courseDetails;
};

const getAvailableDays = async ({
    year,
    department
}: {
    year: number;
    department: string;
}) => {
    const query3 =
        'SELECT available_days FROM year_day_restrictions WHERE department = $1 AND year = $2';
    const res3 = await client.query(query3, [department, year]);
    const yearLevelAvailableDays = res3.rows[0]?.available_days || SCHOOL_DAYS;
    return yearLevelAvailableDays;
};

const getMaxDays = async ({
    year,
    department
}: {
    year: number;
    department: string;
}) => {
    const query3 =
        'SELECT max_days FROM year_day_restrictions WHERE department = $1 AND year = $2';
    const res3 = await client.query(query3, [department, year]);

    const yearLevelMaxDays = res3.rows[0]?.max_days || 6;

    return yearLevelMaxDays;
};

const getAvailableTime = async ({
    year,
    department
}: {
    year: number;
    department: string;
}) => {
    const query2 =
        'SELECT restrictions FROM year_time_restrictions WHERE department = $1 AND year = $2';
    const res2 = await client.query(query2, [department, year]);
    const yearLevelTimeConstraints = res2.rows[0].restrictions;
    return yearLevelTimeConstraints;
};

const getRequiredCourses = async (curriculum: any) => {
    let requiredCourses: any = {};
    for (let i = 0; i < curriculum.length; i++) {
        let course = curriculum[i];

        if (!requiredCourses[course]) {
            requiredCourses[course] = 0;
        }

        // get the course
        const query = 'SELECT total_units FROM courses WHERE subject_code = $1';
        const res = await client.query(query, [course]);
        const totalUnits = res.rows[0].total_units;

        requiredCourses[course] = totalUnits;
    }

    return requiredCourses;
};
