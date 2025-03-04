// generate pero timeblocks and courses lng
//   - eto ung iccross over multiple times para marami like possible something
//   - tapos saka mag aassign sa baba

import { spec } from 'node:test/reporters';
import { Client } from 'pg';
import { SCHOOL_DAYS } from './constants';
import { evaluateV3 } from './evaluatev3';

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

// cross over ung ginenerate na timeblocks

// loop this by 100 generations

// mag generate muna ng 100 na timeblocks
// assignan lahat un ng room and tas
// evaluate

// ung top 50 iccrossover ng via sections UNG TIMEBLOCK LAYER LNG
// so 100 na ulit
// assignan ulit un lahat ng room and tas
// evaluate

// ung curriculum ng IS

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
    let population: {
        classSchedule: any;
        classScheduleWithRooms: any;
        roomConflicts: number;
        TASConflicts: number;
    }[] = [];

    for (let i = 0; i < 10; i++) {
        console.log('generating population');

        // GENERATE CS
        console.log('generating chromosome: ', i);
        let classSchedule: any = {
            CS: {},
            IT: {},
            IS: {}
        };
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
        classSchedule['CS'][1] = schedulesFirst;

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
        classSchedule['CS'][2] = schedulesSecond;

        let schedulesThird = await generateV3({
            department: 'CS',
            year: 3,
            semester: 2,
            sectionSpecializations: {
                CSA: 'Core CS',
                CSB: 'Game Development',
                CSC: 'Data Science',
                CSD: 'Data Science',
                CSE: 'Data Science',
                CSF: 'Data Science'
            }
        });
        classSchedule['CS'][3] = schedulesThird;

        let schedulesFourth = await generateV3({
            department: 'CS',
            year: 4,
            semester: 2,
            sectionSpecializations: {
                CSA: 'Core CS',
                CSB: 'Game Development',
                CSC: 'Data Science'
            }
        });
        classSchedule['CS'][4] = schedulesFourth;

        // GENERATE IT
        let schedulesFirstIT = await generateV3({
            department: 'IT',
            year: 1,
            semester: 2,
            sectionSpecializations: {
                ITA: 'none',
                ITB: 'none',
                ITC: 'none',
                ITD: 'none',
                ITE: 'none',
                ITF: 'none',
                ITG: 'none',
                ITH: 'none'
            }
        });
        classSchedule['IT'][1] = schedulesFirstIT;

        let schedulesSecondIT = await generateV3({
            department: 'IT',
            year: 2,
            semester: 2,
            sectionSpecializations: {
                ITA: 'none',
                ITB: 'none',
                ITC: 'none',
                ITD: 'none',
                ITE: 'none',
                ITF: 'none',
                ITG: 'none'
            }
        });
        classSchedule['IT'][2] = schedulesSecondIT;

        let schedulesThirdIT = await generateV3({
            department: 'IT',
            year: 3,
            semester: 2,
            sectionSpecializations: {
                ITA: 'Network and Security',
                ITB: 'Network and Security',
                ITC: 'Network and Security',
                ITD: 'Web and Mobile Dev',
                ITE: 'Web and Mobile Dev',
                ITF: 'Web and Mobile Dev',
                ITG: 'IT Automation',
                ITH: 'IT Automation',
                ITI: 'IT Automation'
            }
        });
        classSchedule['IT'][3] = schedulesThirdIT;

        let schedulesFourthIT = await generateV3({
            department: 'IT',
            year: 4,
            semester: 2,
            sectionSpecializations: {
                ITA: 'Network and Security',
                ITB: 'Network and Security',
                ITC: 'Network and Security',
                ITD: 'Web and Mobile Dev',
                ITE: 'Web and Mobile Dev',
                ITF: 'Web and Mobile Dev',
                ITG: 'IT Automation'
            }
        });
        classSchedule['IT'][4] = schedulesFourthIT;

        // GENERATE UNG SA IS
        let schedulesFirstIS = await generateV3({
            department: 'IS',
            year: 1,
            semester: 2,
            sectionSpecializations: {
                ISA: 'none',
                ISB: 'none',
                ISC: 'none',
                ISD: 'none'
            }
        });
        classSchedule['IS'][1] = schedulesFirstIS;

        let schedulesSecondIS = await generateV3({
            department: 'IS',
            year: 2,
            semester: 2,
            sectionSpecializations: {
                ISA: 'none',
                ISB: 'none',
                ISC: 'none'
            }
        });
        classSchedule['IS'][2] = schedulesSecondIS;

        let schedulesThirdIS = await generateV3({
            department: 'IS',
            year: 3,
            semester: 2,
            sectionSpecializations: {
                ISA: 'Business Analytics',
                ISB: 'Business Analytics',
                ISC: 'Service Management'
            }
        });
        classSchedule['IS'][3] = schedulesThirdIS;

        let schedulesFourthIS = await generateV3({
            department: 'IS',
            year: 4,
            semester: 2,
            sectionSpecializations: {
                ISA: 'Business Analytics',
                ISB: 'Business Analytics',
                ISC: 'Service Management'
            }
        });
        classSchedule['IS'][4] = schedulesFourthIS;

        // check if mas okay mauna ung room or mauna ung tas
        console.log('assigning tas');
        let TASSchedule = {};
        let scheduleWithTASAssignment = await assignTAS({
            classSchedules: classSchedule,
            TASSchedule
        });

        let TASConflicts = evaluateTASAssignment(scheduleWithTASAssignment);

        // ung sa restrictions nila dapat masunod din
        return {
            scheduleWithTASAssignment,
            TASSchedule,
            TASConflicts
        }

        console.log('assigning rooms');
        let roomSchedule = {};

        let classScheduleWithRooms = await assignRooms({
            classSchedules: scheduleWithTASAssignment,
            roomSchedule
        });

        let roomConflicts = evaluateRoomAssignment(classScheduleWithRooms);

        console.log('pushing to population');
        population.push({
            classSchedule,
            classScheduleWithRooms,
            roomConflicts,
            TASConflicts
        });
    }

    // console.log('top 50')
    population = getTop50(population);

    // max gens is 10
    // pero pwede n mag exit once may score na na 0

    loop0: for (let g = 0; g < 10; g++) {
        console.log('crossover num: ', g);

        // cross over the population
        let half = population.length / 2;
        for (let i = 0; i < half; i++) {
            let chromosomeA = structuredClone(population[i].classSchedule);
            let chromosomeB = structuredClone(
                population[half + i].classSchedule
            );

            // loop thru the sched
            // for every year key i generate a random cross over point
            // tapos i cross over
            let departmentKeys = Object.keys(chromosomeA);
            for (let j = 0; j < departmentKeys.length; j++) {
                let departmentSched = chromosomeA[departmentKeys[j]];
                let departmentSchedB = chromosomeB[departmentKeys[j]];

                let yearKeys = Object.keys(departmentSched);
                for (let k = 0; k < yearKeys.length; k++) {
                    let yearSched = departmentSched[yearKeys[k]];
                    let yearSchedB = departmentSchedB[yearKeys[k]];

                    let classKeys = Object.keys(yearSched);
                    let crossoverPoint = Math.floor(
                        Math.random() * classKeys.length
                    );

                    for (let m = 0; m < crossoverPoint; m++) {
                        let classKey = classKeys[m]; // CSA CSB CSC | CSD CSE CSF

                        // console.log('before')
                        // console.log('yr sched', yearSched)
                        // console.log('yr sched b', yearSchedB)

                        let schedSwitch = yearSched[classKey];
                        yearSched[classKey] = yearSchedB[classKey];
                        yearSchedB[classKey] = schedSwitch;

                        // console.log('after')
                        // console.log('yr sched', yearSched)
                        // console.log('yr sched b', yearSchedB)
                    }
                }
            }

            let TASSchedule = {};
            let roomSchedule = {};
            // add rooms
            console.log('adding new chromosome a');
            let chromosomeAClassScheduleWithTAS = await assignTAS({
                classSchedules: chromosomeA,
                TASSchedule
            });
            let chromosomeATASConflicts = evaluateTASAssignment(
                chromosomeAClassScheduleWithTAS
            );

            let chromosomeAClassScheduleWithRooms = await assignRooms({
                classSchedules: chromosomeAClassScheduleWithTAS,
                roomSchedule
            });
            let chromosomeARoomConflicts = evaluateRoomAssignment(
                chromosomeAClassScheduleWithRooms
            );

            population.push({
                classSchedule: chromosomeA,
                classScheduleWithRooms: chromosomeAClassScheduleWithRooms,
                roomConflicts: chromosomeARoomConflicts,
                TASConflicts: chromosomeATASConflicts
            });
            console.log('room conflict a', chromosomeARoomConflicts);
            console.log('tas conflict a', chromosomeATASConflicts);

            let TASScheduleB = {};
            let roomScheduleB = {};
            console.log('adding new chromosome b');
            let chromosomeBClassScheduleWithTAS = await assignTAS({
                classSchedules: chromosomeB,
                TASSchedule: TASScheduleB
            });
            let chromosomeBTASConflicts = evaluateTASAssignment(
                chromosomeBClassScheduleWithTAS
            );

            let chromosomeBClassScheduleWithRooms = await assignRooms({
                classSchedules: chromosomeBClassScheduleWithTAS,
                roomSchedule: roomScheduleB
            });
            let chromosomeBRoomConflicts = evaluateRoomAssignment(
                chromosomeBClassScheduleWithRooms
            );

            population.push({
                classSchedule: chromosomeB,
                classScheduleWithRooms: chromosomeBClassScheduleWithRooms,
                roomConflicts: chromosomeBRoomConflicts,
                TASConflicts: chromosomeBTASConflicts
            });
            console.log('room conflict b', chromosomeBRoomConflicts);
            console.log('tas conflict b', chromosomeATASConflicts);
        }

        population = getTop50(population);
        if (
            population[0].roomConflicts <= 0 &&
            population[0].TASConflicts <= 0 &&
            population.length >= 50
        ) {
            console.log('broke out early', g);
            break loop0;
        }
    }

    population = getTop50(population);
    console.log(population);
    console.log(population[0]);

    // evaluateV3({chromosome: population[0].classScheduleWithRooms, semester: 2})

    return { chromosome: population[0].classScheduleWithRooms };
};

// eval function sa new structure -> this wont work sa new kasi nga null ung pag check kung may conflict b ro wala

// start ung sa pag lagay ng tas

const getTop50 = (population: any) => {
    let top50 = population
        .sort(
            (a: any, b: any) =>
                a.TASConflicts - b.TASConflicts ||
                a.roomConflicts - b.roomConflicts
        )
        .slice(0, 50);
    return top50;
};

const evaluateTASAssignment = (classSchedule: any) => {
    let conflicts = 0;

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

                        if (schedBlock.tas == null) {
                            conflicts++;
                        }
                    }
                }
            }
        }
    }
    return conflicts;
};

const evaluateRoomAssignment = (classSchedule: any) => {
    let conflicts = 0;

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

                        if (schedBlock.room == null) {
                            conflicts++;
                        }
                    }
                }
            }
        }
    }
    return conflicts;
};

// mali ung pag assign ng saturday sa room sched meron sat sa class sched pero walang sat sa room sched
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
            // console.log('ad', availableDays);
            // console.log('md', maxDays);
            // console.log(availableTime);
            // console.log(requiredCourses);

            // loop thru the available days and max days

            // start j range from 0-3 para ndi nag kkumpol sa start ng week ung assignments

            // M T W TH F S
            let start;
            let skip;
            if (year == 2 || year == 3) {
                let jProb = Math.random();
                if (jProb <= 0.1) {
                    start = 0;
                } else if (jProb <= 0.2) {
                    start = 1;
                } else if (jProb <= 0.7) {
                    start = 2;
                } else {
                    start = 3;
                }
            } else if (year == 4) {
                let skipProb = Math.random();
                if (skipProb <= 0.3) {
                    start = 0;
                    skip = 5;
                } else {
                    start = 4;
                    skip = 1;
                }
            } else {
                start = 0;
            }

            let consecutiveHours = 0;
            let assignedDays = 0;
            loop2: for (let k = start; k < availableDays.length; ) {
                // try random skip based on probability
                let skipProb = Math.random();
                if (skipProb >= 0.6) {
                    continue loop2;
                }

                if (assignedDays >= maxDays) {
                    break loop2;
                }

                let schoolDay = availableDays[k];
                daySched = [];

                let startTime = getStartAndEndTime({
                    startRestriction: availableTime[availableDays[k]][0]?.start,
                    endRestriction: availableTime[availableDays[k]][0]?.end
                }).start; // should change
                let maxEndTime = getStartAndEndTime({
                    startRestriction: availableTime[availableDays[k]][0]?.start,
                    endRestriction: availableTime[availableDays[k]][0]?.end
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
                        currentTime = addMilitaryTimes(
                            currentTime,
                            militaryTime
                        );

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
                        addMilitaryTimes(
                            currentTime,
                            subtractMilitaryTime(endTimeCopy, currentTime)
                        ) > maxEndTime
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
                        courseDetails.restrictions[availableDays[k]];
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

                // for max and available days
                assignedDays++;
                if (year == 4 && skip) {
                    k += skip;
                } else {
                    k++;
                }
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

const assignTAS = async ({
    classSchedules,
    TASSchedule
}: {
    classSchedules: any;
    TASSchedule: any;
}) => {
    let classSchedulesCopy = structuredClone(classSchedules);

    // loop thru sections in generate
    let departmentKeys = Object.keys(classSchedulesCopy);
    for (let i = 0; i < departmentKeys.length; i++) {
        let departmentSched = classSchedulesCopy[departmentKeys[i]];

        let yearKeys = Object.keys(departmentSched);
        for (let j = 0; j < yearKeys.length; j++) {
            let yearSched = departmentSched[yearKeys[j]];

            let classKeys = Object.keys(yearSched);
            for (let k = 0; k < classKeys.length; k++) {
                let classSched = yearSched[classKeys[k]];

                for (let m = 0; m < SCHOOL_DAYS.length; m++) {
                    let daySched = classSched[SCHOOL_DAYS[m]];

                    // loop thru day sched
                    for (let n = 0; n < (daySched?.length ?? 0); n++) {
                        let schedBlock = daySched[n];

                        let course = schedBlock.course;
                        let timeBlock = schedBlock.timeBlock;

                        if (course.category === 'gened') {
                            schedBlock.tas = {
                                tas_id: 'GENED PROF'
                            };
                            continue;
                        }

                        // assign room
                        let tas = await findTASForCourse({
                            course: course.subjectCode,
                            TASSchedule,
                            department: departmentKeys[i],
                            timeBlock,
                            schoolDay: SCHOOL_DAYS[m]
                        });

                        schedBlock.tas = tas;

                        if (tas != null) {
                            if (!TASSchedule?.[tas.tas_id]) {
                                TASSchedule[tas.tas_id] = {
                                    M: [],
                                    T: [],
                                    W: [],
                                    TH: [],
                                    F: [],
                                    S: [],
                                    units: 0
                                };
                            }
                            TASSchedule[tas.tas_id][SCHOOL_DAYS[m]].push({
                                course: course.subjectCode,
                                timeBlock
                            });
                            TASSchedule[tas.tas_id]['units'] +=
                                course.unitsPerClass;
                        }
                    }
                }
            }
        }
    }

    return classSchedulesCopy;
};

const findTASForCourse = async ({
    course,
    TASSchedule,
    department,
    timeBlock,
    schoolDay
}: {
    course: string;
    TASSchedule: any;
    department: string;
    timeBlock: any;
    schoolDay: string;
}) => {
    // try teaches that course and in that department
    const query =
        'SELECT * FROM teaching_academic_staff WHERE $1 = ANY(courses) AND main_department = $2;';
    const res = await client.query(query, [course, department]);
    const availableTAS = res.rows;

    loop0: for (let i = 0; i < availableTAS.length; i++) {
        let prospectTAS = availableTAS[i];

        // check if pwede pa sa units
        if (
            (TASSchedule[prospectTAS.tas_id]?.['units'] ?? 0) >=
            prospectTAS.units
        ) {
            continue loop0;
        }

        // check if pwede sa tas schedule
        let roomAvailability = checkTASAvailability({
            TASSchedule,
            timeBlock,
            tas: prospectTAS.tas_id,
            restrictions: prospectTAS.restrictions,
            restrictionType: prospectTAS.restriction_type,
            schoolDay
        });

        if (!roomAvailability) {
            continue;
        }

        return {
            tas_id: prospectTAS.tas_id,
            tas_name: prospectTAS.name
        };
    }

    // try teaches that course but not in that department
    const query1 =
        'SELECT * FROM teaching_academic_staff WHERE $1 = ANY(courses) AND main_department != $2;';
    const res1 = await client.query(query1, [course, department]);
    const availableTAS1 = res1.rows;

    loop1: for (let i = 0; i < availableTAS1.length; i++) {
        let prospectTAS = availableTAS1[i];

        if (
            (TASSchedule[prospectTAS.tas_id]?.['units'] ?? 0) >=
            prospectTAS.units
        ) {
            continue loop1;
        }

        // check if pwede sa room schedule
        let roomAvailability = checkTASAvailability({
            TASSchedule,
            timeBlock,
            tas: prospectTAS.tas_id,
            restrictions: prospectTAS.restrictions,
            restrictionType: prospectTAS.restriction_type,
            schoolDay
        });

        if (!roomAvailability) {
            continue;
        }

        return {
            tas_id: prospectTAS.tas_id,
            tas_name: prospectTAS.name
        };
    }

    // try in that department but does not teach that course
    const query2 =
        'SELECT * FROM teaching_academic_staff WHERE $1 != ANY(courses) AND main_department = $2;';
    const res2 = await client.query(query2, [course, department]);
    const availableTAS2 = res2.rows;

    loop2: for (let i = 0; i < availableTAS2.length; i++) {
        let prospectTAS = availableTAS2[i];

        if (
            (TASSchedule[prospectTAS.tas_id]?.['units'] ?? 0) >=
            prospectTAS.units
        ) {
            continue loop2;
        }

        // check if pwede sa room schedule
        let roomAvailability = checkTASAvailability({
            TASSchedule,
            timeBlock,
            tas: prospectTAS.tas_id,
            restrictions: prospectTAS.restrictions,
            restrictionType: prospectTAS.restriction_type,
            schoolDay
        });

        if (!roomAvailability) {
            continue;
        }

        return {
            tas_id: prospectTAS.tas_id,
            tas_name: prospectTAS.name
        };
    }

    // try all
    const query3 =
        'SELECT * FROM teaching_academic_staff WHERE $1 != ANY(courses) AND main_department != $2;';
    const res3 = await client.query(query3, [course, department]);
    const availableTAS3 = res3.rows;

    loop3: for (let i = 0; i < availableTAS3.length; i++) {
        let prospectTAS = availableTAS3[i];

        if (
            (TASSchedule[prospectTAS.tas_id]?.['units'] ?? 0) >=
            prospectTAS.units
        ) {
            continue loop3;
        }

        // check if pwede sa room schedule
        let roomAvailability = checkTASAvailability({
            TASSchedule,
            timeBlock,
            tas: prospectTAS.tas_id,
            restrictions: prospectTAS.restrictions,
            restrictionType: prospectTAS.restriction_type,
            schoolDay
        });

        if (!roomAvailability) {
            continue;
        }

        return {
            tas_id: prospectTAS.tas_id,
            tas_name: prospectTAS.name
        };
    }

    return null;
};

const checkTASAvailability = ({
    TASSchedule,
    timeBlock,
    tas,
    restrictions,
    restrictionType,
    schoolDay
}: {
    TASSchedule: any;
    timeBlock: any;
    tas: string;
    restrictions: any;
    restrictionType: string;
    schoolDay: string;
}) => {
    let specTASDaySched = TASSchedule?.[tas]?.[schoolDay];

    // check sa restrictions if soft go lng if hard pass
    let restrictionDaySched = restrictions[schoolDay];

    for (let i = 0; i < (restrictionDaySched?.length ?? 0); i++) {
        let tasTimeBlock = restrictionDaySched[i];

        if (
            (parseInt(timeBlock.start) >= parseInt(tasTimeBlock.start) &&
                parseInt(timeBlock.start) < parseInt(tasTimeBlock.end)) ||
            (parseInt(timeBlock.end) > parseInt(tasTimeBlock.start) &&
                parseInt(timeBlock.end) <= parseInt(tasTimeBlock.end)) ||
            (parseInt(timeBlock.start) <= parseInt(tasTimeBlock.start) &&
                parseInt(timeBlock.end) >= parseInt(tasTimeBlock.end)) ||
            (parseInt(timeBlock.start) >= parseInt(tasTimeBlock.start) &&
                parseInt(timeBlock.end) <= parseInt(tasTimeBlock.end))
        ) {
            if (restrictionType === 'hard') {
                return false;
            }
        }
    }

    if (!specTASDaySched) {
        return true;
    }

    for (let i = 0; i < specTASDaySched.length; i++) {
        let tasTimeBlock = specTASDaySched[i].timeBlock;

        if (
            (parseInt(timeBlock.start) >= parseInt(tasTimeBlock.start) &&
                parseInt(timeBlock.start) < parseInt(tasTimeBlock.end)) ||
            (parseInt(timeBlock.end) > parseInt(tasTimeBlock.start) &&
                parseInt(timeBlock.end) <= parseInt(tasTimeBlock.end)) ||
            (parseInt(timeBlock.start) <= parseInt(tasTimeBlock.start) &&
                parseInt(timeBlock.end) >= parseInt(tasTimeBlock.end)) ||
            (parseInt(timeBlock.start) >= parseInt(tasTimeBlock.start) &&
                parseInt(timeBlock.end) <= parseInt(tasTimeBlock.end))
        ) {
            return false;
        } //1200 1500 //1230 1400
    }

    return true;
};

// may conflict pa rin
const assignRooms = async ({
    classSchedules,
    roomSchedule
}: {
    classSchedules: any;
    roomSchedule: any;
}) => {
    let classSchedulesCopy = structuredClone(classSchedules);

    // loop thru sections in generate
    let departmentKeys = Object.keys(classSchedulesCopy);
    for (let i = 0; i < departmentKeys.length; i++) {
        let departmentSched = classSchedulesCopy[departmentKeys[i]];

        let yearKeys = Object.keys(departmentSched);
        for (let j = 0; j < yearKeys.length; j++) {
            let yearSched = departmentSched[yearKeys[j]];

            let classKeys = Object.keys(yearSched);
            for (let k = 0; k < classKeys.length; k++) {
                let classSched = yearSched[classKeys[k]];

                for (let m = 0; m < SCHOOL_DAYS.length; m++) {
                    let daySched = classSched[SCHOOL_DAYS[m]];

                    // loop thru day sched
                    for (let n = 0; n < (daySched?.length ?? 0); n++) {
                        let schedBlock = daySched[n];

                        let course = schedBlock.course;
                        let timeBlock = schedBlock.timeBlock;

                        if (course.subjectCode.startsWith('PATHFIT')) {
                            // change this back if mag error lol
                            schedBlock.room = {
                                room_id: 'PE ROOM'
                            };
                            continue;
                        }

                        // assign room
                        let room = await findRoomForCourse({
                            course: course.subjectCode,
                            courseType: course.type,
                            roomSchedule,
                            specificRoomAssignment:
                                course.specificRoomAssignment,
                            department: departmentKeys[i],
                            timeBlock,
                            schoolDay: SCHOOL_DAYS[m]
                        });

                        schedBlock.room = room;

                        if (room != null) {
                            if (!roomSchedule?.[room]) {
                                roomSchedule[room] = {
                                    M: [],
                                    T: [],
                                    W: [],
                                    TH: [],
                                    F: [],
                                    S: []
                                };
                            }
                            roomSchedule[room][SCHOOL_DAYS[m]].push({
                                course: course.subjectCode,
                                timeBlock
                            });
                        }
                    }
                }
            }
        }
    }

    return classSchedulesCopy;
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
    specificRoomAssignment: string;
    department: string;
    timeBlock: any;
    schoolDay: string;
}) => {
    if (specificRoomAssignment) {
        // check kung pwede sa room na un pero dapat oo lolz
        // check if pwede sa room schedule
        let roomAvailability = checkRoomAvailability({
            roomSchedule,
            timeBlock,
            room: specificRoomAssignment,
            schoolDay
        });

        if (roomAvailability) {
            return specificRoomAssignment;
        } else {
            return null;
        }
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

        return prospectRoom.room_id;
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

        return prospectRoom.room_id;
    }

    // wala na talaga kuha na sa ibang department ng kahit ano
    const query3 = 'SELECT room_id FROM rooms WHERE main_department != $1';
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

        return prospectRoom.room_id;
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

    if (!startRestriction && !endRestriction) {
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
