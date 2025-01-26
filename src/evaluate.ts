import { Client } from 'pg';
import { chromosome } from './data';
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

// check if complete ung assignment based sa curriculum
const evaluateCoursesAssignment = async ({
    semester,
    chromosome
}: {
    semester: number;
    chromosome: any;
}) => {
    let violationCount = 0;
    let violations: any = [];

    const queryCS =
        "SELECT courses FROM curriculum WHERE semester = $1 AND department = 'CS' ORDER BY year";
    const res = await client.query(queryCS, [semester]);
    const curriculumCS = res.rows;

    const firstCSCurriculum = curriculumCS[0].courses;
    const secondCSCurriculum = curriculumCS[1].courses;
    const thirdCSCurriculum = curriculumCS[2].courses;
    const fourthCSCurriculum = curriculumCS[3].courses;

    const queryIT =
        "SELECT courses FROM curriculum WHERE semester = $1 AND department = 'IT' ORDER BY year";
    const resIT = await client.query(queryIT, [semester]);
    const curriculumIT = resIT.rows;

    const firstITCurriculum = curriculumIT[0].courses;
    // const secondITCurriculum = curriculumIT[1].courses;
    // const thirdITCurriculum = curriculumIT[2].courses;
    // const fourthITCurriculum = curriculumIT[3].courses;

    const queryIS =
        "SELECT courses FROM curriculum WHERE semester = $1 AND department = 'IS' ORDER BY year";
    const resIS = await client.query(queryIS, [semester]);
    const curriculumIS = resIS.rows;

    const firstISCurriculum = curriculumIS[0].courses;
    // const secondISCurriculum = curriculumIS[1].courses;
    // const thirdISCurriculum = curriculumIS[2].courses;
    // const fourthISCurriculum = curriculumIS[3].courses;
    
    // first year muna
    // loop thru the courses
    // query the total units
    // cross check with all units in weekly sched per 1st year section

    // cs 1st year 
    for (let j = 0; j < chromosome[0].cs_1st.length; j++) {
        let section = chromosome[0].cs_1st[j];

        let totalUnitsPerSection = getTotalUnitsFromWeeklySchedule({
            sectionSchedule: section
        });

        for (let i = 0; i < firstCSCurriculum.length; i++) {
            const querySubj =
                'SELECT total_units, type FROM courses WHERE subject_code = $1';
            const res = await client.query(querySubj, [firstCSCurriculum[i]]);
            const totalUnits = res.rows[0].total_units;
            const subjectCode = firstCSCurriculum[i];

            if ((totalUnitsPerSection[subjectCode] ?? 0) < totalUnits) {
                violationCount++;
                violations.push({course: subjectCode, description: 'kulang units', section: Object.keys(section)[0]})
            }
        }
    }
    

    // cs 2nd year
    for (let j = 0; j < chromosome[1].cs_2nd.length; j++) {
        let section = chromosome[1].cs_2nd[j];

        let totalUnitsPerSection = getTotalUnitsFromWeeklySchedule({
            sectionSchedule: section
        });

        for (let i = 0; i < secondCSCurriculum.length; i++) {
            const querySubj =
                'SELECT total_units, type FROM courses WHERE subject_code = $1';
            const res = await client.query(querySubj, [secondCSCurriculum[i]]);
            const totalUnits = res.rows[0].total_units;
            const subjectCode = secondCSCurriculum[i];

            if ((totalUnitsPerSection[subjectCode] ?? 0) < totalUnits) {
                violationCount++;
                violations.push({course: subjectCode, description: 'kulang units', section: Object.keys(section)[0]})
            }
        }
    }
    
    // third year
    // fourth year

    // it 
    for (let j = 0; j < chromosome[2].it_1st.length; j++) {
        let section = chromosome[2].it_1st[j];

        let totalUnitsPerSection = getTotalUnitsFromWeeklySchedule({
            sectionSchedule: section
        });

        for (let i = 0; i < firstITCurriculum.length; i++) {
            const querySubj =
                'SELECT total_units, type FROM courses WHERE subject_code = $1';
            const res = await client.query(querySubj, [firstITCurriculum[i]]);
            const totalUnits = res.rows[0].total_units;
            const subjectCode = firstITCurriculum[i];

            if ((totalUnitsPerSection[subjectCode] ?? 0) < totalUnits) {
                violationCount++;
                violations.push({course: subjectCode, description: 'kulang units', section: Object.keys(section)[0]})
            }
        }
    }

    // 2nd
    // 3rd
    // 4th
    
    // is
    for (let j = 0; j < chromosome[3].is_1st.length; j++) {
        let section = chromosome[3].is_1st[j];

        let totalUnitsPerSection = getTotalUnitsFromWeeklySchedule({
            sectionSchedule: section
        });

        for (let i = 0; i < firstISCurriculum.length; i++) {
            const querySubj =
                'SELECT total_units, type FROM courses WHERE subject_code = $1';
            const res = await client.query(querySubj, [firstISCurriculum[i]]);
            const totalUnits = res.rows[0].total_units;
            const subjectCode = firstISCurriculum[i];

            if ((totalUnitsPerSection[subjectCode] ?? 0) < totalUnits) {
                violationCount++;
                violations.push({course: subjectCode, description: 'kulang units', section: Object.keys(section)[0]})
            }
        }
    }

    // 2nd
    // 3rd
    // 4th

    return violations

};

const getTotalUnitsFromWeeklySchedule = ({
    sectionSchedule
}: {
    sectionSchedule: any;
}) => {
    // loop thru the week and add na the units
    // may obj nlng to store lahat ng units

    const totalUnitsPerCourse: any = {};

    const keys = Object.keys(sectionSchedule);
    const sectionName = keys[0];
    const schedule = sectionSchedule[sectionName];

    for (let i = 0; i < SCHOOL_DAYS.length; i++) {
        for (let j = 0; j < schedule[SCHOOL_DAYS[i]].length; j++) {
            if (
                totalUnitsPerCourse[
                    schedule[SCHOOL_DAYS[i]][j].course.subject_code
                ] !== undefined
            ) {
                totalUnitsPerCourse[
                    schedule[SCHOOL_DAYS[i]][j].course.subject_code
                ] += schedule[SCHOOL_DAYS[i]][j].course.units;
            } else {
                totalUnitsPerCourse[
                    schedule[SCHOOL_DAYS[i]][j].course.subject_code
                ] = schedule[SCHOOL_DAYS[i]][j].course.units;
            }
        }
    }

    return totalUnitsPerCourse;
};

export const evaluate = async () => {
    let violations = await evaluateCoursesAssignment({ semester: 2, chromosome: chromosome });

    return violations;
};
