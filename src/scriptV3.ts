// generate pero timeblocks and courses lng
//   - eto ung iccross over multiple times para marami like possible something
//   - tapos saka mag aassign sa baba

import { spec } from 'node:test/reporters';
import { Client } from 'pg';
import { SCHOOL_DAYS } from './constants';
import { getEndTime } from './generateV2';

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

    await generateV3({
        department: 'CS',
        year: 1,
        sectionSpecializations: {
            CSA: 'none',
            CSB: 'none',
            CSC: 'none',
            CSD: 'none'
        }
    });
};

const generateV3 = async ({
    department,
    year,
    sectionSpecializations
}: {
    department: string;
    year: number;
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
            'SELECT courses FROM curriculum WHERE department = $1 AND year = $2';
        const res = await client.query(query, [department, year]);
        const curriculum = res.rows[0].courses;

        specializationsAndCurriculum['none'] = curriculum;
    }

    for (let i = 0; i < specializations.length; i++) {
        let specCurriculum = specializationsAndCurriculum[specializations[i]];
        let sections = specializationsAndSections[specializations[i]];

        for (let j = 0; j < sections.length; j++) {
            let section = sections[j];
            let sectionSched = {section: {}};

            let availableDays = await getAvailableDays({ year, department });
            let maxDays = await getMaxDays({ year, department });
            let availableTime = await getAvailableTime({ year, department });

            let requiredCourses = await getRequiredCourses({
                curriculum: specCurriculum
            });

            console.log(section);
            console.log(availableDays);
            console.log(maxDays);
            console.log(availableTime);
            console.log(requiredCourses);

            let consecutiveHours = 0;

            loop2:
            for (let k = 0; k < SCHOOL_DAYS.length; k++) {
                let schoolDay = SCHOOL_DAYS[k]
                let daySched: any = {[schoolDay]: []};
                
                let start = availableTime[SCHOOL_DAYS[k]].start;
                let end = availableTime[SCHOOL_DAYS[k]].end;
                let maxEndTime = parseInt(end);

                for (let currentTime = parseInt(start); currentTime < maxEndTime; ) {
                    // add break if 3 consecutive hours na

                    if (consecutiveHours >= 3){
                        consecutiveHours = 0;
                        let randomBreakTime = Math.floor(Math.random() * 210) + 30 // in minutes minimum 30mins max 4 hrs
                        let militaryTime = convertMinutesToMilitaryTime(randomBreakTime)
                        currentTime += militaryTime
                    }

                    let randomCourse =
                        specCurriculum[
                            Math.floor(Math.random() * specCurriculum.length)
                        ];
                    let courseDetails = await getCourseDetails(randomCourse);

                    let endTime = getEndTime({
                        timeStart: currentTime,
                        courseType: courseDetails.type,
                        unitsPerClass: courseDetails.unitsPerClass
                    })

                    // check if pwede pa sa end time
                    if (currentTime + endTime > maxEndTime){
                        continue loop2;
                    }

                    // check if pwede ba ung course na toh at this time if not tuloy lng
                    let restrictions = courseDetails.restrictions[SCHOOL_DAYS[k]];
                    for (let n = 0; n < restrictions.length; n++){
                        if (currentTime >= restrictions[n].start && currentTime < restrictions[n].end){
                            continue;
                        }
                    }

                    // pwede ung course so go assign 
                    let schedBlock: any = {};

                    schedBlock = {
                        course: courseDetails.subjectCode,
                        timeBlock: {
                            start: currentTime.toString(),
                            end: endTime.toString()
                        }
                    };

                    daySched[schoolDay].push(schedBlock)

                    // add the units per class to the current time
                    // add the units per class to the consecutive hours
                    let totalCourseHoursAssigned = endTime - currentTime;
                    currentTime += totalCourseHoursAssigned;
                    consecutiveHours += convertMilitaryTimeToMinutes(totalCourseHoursAssigned)
                }

                console.log('assigned courses')

                console.log(section)
                console.log(schoolDay)
                console.log(daySched)

                return;
            }

            // loop thru the school days
            // loop thru the day
            // select a random class
            // check if pwede sa restrictions
            // track consecutive
            // track end
            // assign sequentially from the constraint start to the constraint end
            // subtract the units per class in the copy of subjects with total units
            // check if 3 hours na ba ung consecutive
            // if yes add random break from 30 min to max possible
            // if not get a new random course
        }
    }
    // loop thru specializations and sections and go thru each specialization assigning the courses needed for that spec curriculum
    // if 3 hours na add 1 hr break, if sobra na sa day na un next day na - random nlng siguro ung break pero basta after 3 hours break na
    // note lng na ung crossover is per section para walang conflict na mangyayari
};

const convertMilitaryTimeToMinutes = (totalMilitaryHours: number) => {
    let hours = (totalMilitaryHours / 1000) * 60;
    let minutes = totalMilitaryHours % 1000;
    return hours + minutes
}

// 260
const convertMinutesToMilitaryTime = (totalMinutes: number) => {
    let hours = (totalMinutes / 60) * 1000;
    let minutes = (totalMinutes % 60);

    return hours + minutes
}

const getCourseDetails = async (subjectCode: string) => {
    const query = 'SELECT * FROM courses WHERE subject_code = $1';
    const res = await client.query(query, [subjectCode]);
    const courseDetails = {
        subjectCode: res.rows[0].subject_code,
        unitsPerClass: res.rows[0].unitsPerClass,
        type: res.rows[0].type,
        category: res.rows[0].category,
        restrictions: res.rows[0].restrictions,
        totalUnits: res.rows[0].totalUnits,
        specificRoomAssignment: res.rows[0].specificRoomAssignment
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
