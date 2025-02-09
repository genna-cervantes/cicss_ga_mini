import { Client } from "pg";
import { evaluateCoursesAssignment } from "./evaluate";
import { generateYearGene } from "./generate";

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


export const generateChromosomeV2 = async () => {
    let chromosome = [];

    let CSYearGene1 = await generateYearGene({
        dept: 'CS',
        year: 1,
        sem: 2,
        sections: 4
    });
    CSYearGene1 = [{cs_1st: CSYearGene1}]

    // dito ung pag chekc if complete and insert bago ipush sa chromosome
    let violationsCS1 = await evaluateCoursesAssignment({semester: 2, chromosome: CSYearGene1})
    let completeGeneCS1 = await assignMissingCourses({chromosome: CSYearGene1, violations: violationsCS1})
    
    chromosome.push(completeGeneCS1[0]);
    
    let CSYearGene2 = await generateYearGene({
        dept: 'CS',
        year: 2,
        sem: 2,
        sections: 3
    });
    CSYearGene2 = [{cs_2nd: CSYearGene2}]
    
    // dito ung pag chekc if complete and insert bago ipush sa chromosome
    let violationsCS2 = await evaluateCoursesAssignment({semester: 2, chromosome: CSYearGene2})
    let completeGeneCS2 = await assignMissingCourses({chromosome: CSYearGene2, violations: violationsCS2})
    chromosome.push(completeGeneCS2[0]);
    
    let CSYearGene3 = await generateYearGene({
        dept: 'CS',
        year: 3,
        sem: 2,
        sections: 3
    });
    CSYearGene3 = [{cs_3rd: CSYearGene3}]
    
    // dito ung pag chekc if complete and insert bago ipush sa chromosome
    let violationsCS3 = await evaluateCoursesAssignment({semester: 2, chromosome: CSYearGene3})
    let completeGeneCS3 = await assignMissingCourses({chromosome: CSYearGene3, violations: violationsCS3})
    chromosome.push(completeGeneCS3[0]);
    
    let CSYearGene4 = await generateYearGene({
        dept: 'CS',
        year: 4,
        sem: 2,
        sections: 3
    });
    CSYearGene4 = [{cs_4th: CSYearGene4}]
    
    // dito ung pag chekc if complete and insert bago ipush sa chromosome
    let violationsCS4 = await evaluateCoursesAssignment({semester: 2, chromosome: CSYearGene4})
    let completeGeneCS4 = await assignMissingCourses({chromosome: CSYearGene4, violations: violationsCS4})
    chromosome.push(completeGeneCS4[0]);
    
    return chromosome;
};

const assignMissingCourses = async ({chromosome, violations}: {chromosome: any, violations: any}) => {
    let sortedViolationBySection = sortViolationsBySection(violations)

    for (let i = 0; i < chromosome.length; i++) {
        let perYear = chromosome[i];
        let yearAndDepartmentKey = Object.keys(perYear)[0];
        let yearAndDepartmentSchedule = perYear[yearAndDepartmentKey];

        for (let j = 0; j < yearAndDepartmentSchedule.length; j++) {
            let specSection = yearAndDepartmentSchedule[j];
            let specSectionKey = Object.keys(specSection)[0];
            let specSectionSchedule = specSection[specSectionKey];

            console.log(specSectionKey)
            if ((sortedViolationBySection[specSectionKey]?.length ?? 0) > 0){
                // assign that 

                for (let k = 0; k < sortedViolationBySection[specSectionKey].length; k++) {
                    let violation = sortedViolationBySection[specSectionKey][k]

                    for (let l = 0; l < violation.missing_class; l++) {
                        
                        // make this possible time nlng
                        let timeEnd = getEndTime(violation);
                        let miniCourseDetails = await getMiniCourseDetails(violation.course);
                        let roomDetails = await getRoomDetails({courseType: miniCourseDetails.type, specificRoomAssignment: miniCourseDetails.specific_room_assignment});
                        let profDetails = await getProfDetails({course: miniCourseDetails.subject_code})
                
                        let timeBlock = {
                            start: '0700',
                            end: timeEnd,
                        };
                
                        // wag nlng toh inull kung ano nlng ung matic na pwede
                        let schedBlock = {
                            course: miniCourseDetails,
                            prof: profDetails,
                            room: roomDetails,
                            timeBlock,
                        };
                
                        specSectionSchedule['M'].push(schedBlock);
                        
                    }
                }
            }
        }
    }

    return chromosome;

}

const sortViolationsBySection = (violations: any) => {
    let violationsSortedBySection: any = {};

    violations.forEach((violation: any) => {
        if (!violationsSortedBySection[violation.section]){
            violationsSortedBySection[violation.section] = []
        }

        violationsSortedBySection[violation.section].push(violation)
    });

    return violationsSortedBySection;
}

const getMiniCourseDetails = async (courseCode: string) => {

    const query = "SELECT type, category, units_per_class, specific_room_assignment FROM courses WHERE subject_code = $1";
    const res = await client.query(query, [courseCode]);
    const courseDetails = res.rows[0];

    let miniCourseDetails = {
        subject_code: courseCode,
        type: courseDetails.type,
        category: courseDetails.category,
        units: courseDetails.units_per_class,
        specific_room_assignment:
            courseDetails.specific_room_assignment ?? ''
    };

    return miniCourseDetails;
}

const getEndTime = (violation: any) => {
    let timeStart = 700;
    let timeEnd;

    if (violation.course_type === 'lec'){
        timeEnd = (violation.missing_units_per_class * 60)
    }else {
        timeEnd = (violation.missing_units_per_class * 180) // 3 hrs
    }

    let timeEndHours = Math.floor(timeEnd / 60)
    let timeEndMinutes = timeEnd % 60

    timeStart += (timeEndHours * 100) // hours
    timeStart += timeEndMinutes

    return timeStart < 1000 ? '0' + timeStart : timeStart

}

const getRoomDetails = async ({courseType, specificRoomAssignment}: {courseType: string, specificRoomAssignment: string}) => {
    if (specificRoomAssignment){
        const query = 'SELECT * FROM rooms WHERE id = $1'
        const res = await client.query(query, [specificRoomAssignment]);
        const room = res.rows[0]

        return room
    }

    const query = 'SELECT * FROM rooms WHERE type = $1'
    const res = await client.query(query, [courseType]);
    const room = res.rows[0]

    return room
}

const getProfDetails = async ({course}: {course: string}) => {

    const query = 'SELECT * FROM teaching_academic_staff WHERE $1 = ANY(courses)';
    const res = await client.query(query, [course])
    const tas = res.rows[0]

    return tas;
}