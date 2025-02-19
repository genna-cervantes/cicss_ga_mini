import { Client } from 'pg';
import { evaluateCoursesAssignment } from './evaluate';
import { generateYearGene } from './generate';
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

export const generateChromosomeV2 = async () => {
    let chromosome = [];

    let CSYearGene1 = await generateYearGene({
        dept: 'CS',
        year: 1,
        sem: 2,
        sections: 4
    });
    CSYearGene1 = [{ cs_1st: CSYearGene1 }];

    // dito ung pag chekc if complete and insert bago ipush sa chromosome
    let violationsCS1 = await evaluateCoursesAssignment({
        semester: 2,
        chromosome: CSYearGene1
    });
    let completeGeneCS1 = await assignMissingCourses({
        chromosome: CSYearGene1,
        violations: violationsCS1
    });

    chromosome.push(completeGeneCS1[0]);

    let CSYearGene2 = await generateYearGene({
        dept: 'CS',
        year: 2,
        sem: 2,
        sections: 3
    });
    CSYearGene2 = [{ cs_2nd: CSYearGene2 }];

    // dito ung pag chekc if complete and insert bago ipush sa chromosome
    let violationsCS2 = await evaluateCoursesAssignment({
        semester: 2,
        chromosome: CSYearGene2
    });
    let completeGeneCS2 = await assignMissingCourses({
        chromosome: CSYearGene2,
        violations: violationsCS2
    });
    chromosome.push(completeGeneCS2[0]);

    let CSYearGene3 = await generateYearGene({
        dept: 'CS',
        year: 3,
        sem: 2,
        sections: 3
    });
    CSYearGene3 = [{ cs_3rd: CSYearGene3 }];

    // dito ung pag chekc if complete and insert bago ipush sa chromosome
    let violationsCS3 = await evaluateCoursesAssignment({
        semester: 2,
        chromosome: CSYearGene3
    });
    let completeGeneCS3 = await assignMissingCourses({
        chromosome: CSYearGene3,
        violations: violationsCS3
    });
    chromosome.push(completeGeneCS3[0]);

    let CSYearGene4 = await generateYearGene({
        dept: 'CS',
        year: 4,
        sem: 2,
        sections: 3
    });
    CSYearGene4 = [{ cs_4th: CSYearGene4 }];

    // dito ung pag chekc if complete and insert bago ipush sa chromosome
    let violationsCS4 = await evaluateCoursesAssignment({
        semester: 2,
        chromosome: CSYearGene4
    });
    let completeGeneCS4 = await assignMissingCourses({
        chromosome: CSYearGene4,
        violations: violationsCS4
    });
    chromosome.push(completeGeneCS4[0]);

    return chromosome;
};

const assignMissingCourses = async ({
    chromosome,
    violations
}: {
    chromosome: any;
    violations: any;
}) => {
    let sortedViolationBySection = sortViolationsBySection(violations);

    for (let i = 0; i < chromosome.length; i++) {
        let perYear = chromosome[i];
        let yearAndDepartmentKey = Object.keys(perYear)[0];
        let yearAndDepartmentSchedule = perYear[yearAndDepartmentKey];

        for (let j = 0; j < yearAndDepartmentSchedule.length; j++) {
            let specSection = yearAndDepartmentSchedule[j];
            let specSectionKey = Object.keys(specSection)[0];
            let specSectionSchedule = specSection[specSectionKey];

            if ((sortedViolationBySection[specSectionKey]?.length ?? 0) > 0) {
                // assign that

                for (
                    let k = 0;
                    k < sortedViolationBySection[specSectionKey].length;
                    k++
                ) {
                    let violation = sortedViolationBySection[specSectionKey][k];

                    for (let l = 0; l < violation.missing_class; l++) {
                        // make this possible time nlng
                        // let timeEnd = getEndTime(violation);

                        let miniCourseDetails = await getMiniCourseDetails(
                            violation.course
                        );
                        let timeDetails = getTimeDetails({
                            miniCourseDetails,
                            specSectionSched: specSectionSchedule
                        });
                        let roomDetails = await getRoomDetails({
                            courseType: miniCourseDetails.type,
                            specificRoomAssignment:
                                miniCourseDetails.specific_room_assignment
                        });
                        let profDetails = await getProfDetails({
                            course: miniCourseDetails.subject_code, courseCategory: miniCourseDetails.category
                        });

                        // wag nlng toh inull kung ano nlng ung matic na pwede
                        let schedBlock = {
                            course: miniCourseDetails,
                            prof: profDetails,
                            room: roomDetails,
                            timeBlock: timeDetails.timeBlock
                        };

                        specSectionSchedule[timeDetails.day].push(schedBlock);
                    }
                }
            }
        }
    }

    return chromosome;
};

const sortViolationsBySection = (violations: any) => {
    let violationsSortedBySection: any = {};

    violations.forEach((violation: any) => {
        if (!violationsSortedBySection[violation.section]) {
            violationsSortedBySection[violation.section] = [];
        }

        violationsSortedBySection[violation.section].push(violation);
    });

    return violationsSortedBySection;
};

const getMiniCourseDetails = async (courseCode: string) => {
    const query =
        'SELECT type, category, units_per_class, specific_room_assignment FROM courses WHERE subject_code = $1';
    const res = await client.query(query, [courseCode]);
    const courseDetails = res.rows[0];

    let miniCourseDetails = {
        subject_code: courseCode,
        type: courseDetails.type,
        category: courseDetails.category,
        units: courseDetails.units_per_class,
        specific_room_assignment: courseDetails.specific_room_assignment ?? ''
    };

    return miniCourseDetails;
};

export const getEndTime = ({
    timeStart,
    courseType,
    unitsPerClass
}: {
    timeStart: number;
    courseType: string;
    unitsPerClass: any;
}) => {
    let timeEnd;

    if (courseType === 'lec') {
        timeEnd = unitsPerClass * 60;
    } else {
        timeEnd = unitsPerClass * 180; // 3 hrs
    }

    let timeEndHours = Math.floor(timeEnd / 60);
    let timeEndMinutes = timeEnd % 60;

    let startHours = Math.floor(timeStart / 100); // Extract hours (e.g., 14 from 1430)
    let startMinutes = timeStart % 100; // Extract minutes (e.g., 30 from 1430)

    // Add time
    let newMinutes = startMinutes + timeEndMinutes;
    let newHours = startHours + timeEndHours;

    // If minutes exceed 60, adjust hours and minutes
    if (newMinutes >= 60) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes %= 60;
    }

    return newHours * 100 + newMinutes; // Convert back to military time format
};

const getRoomDetails = async ({
    courseType,
    specificRoomAssignment
}: {
    courseType: string;
    specificRoomAssignment: string;
}) => {
    if (specificRoomAssignment) {
        const query = 'SELECT * FROM rooms WHERE id = $1';
        const res = await client.query(query, [specificRoomAssignment]);
        const room = res.rows[0];

        return room;
    }

    const query = 'SELECT * FROM rooms WHERE type = $1';
    const res = await client.query(query, [courseType]);
    const room = res.rows[0];

    return room;
};

const getProfDetails = async ({ course, courseCategory }: { course: string, courseCategory: string }) => {

    if (courseCategory === 'gened'){
        return {
            tas_id: 'GENDED PROF'
        }
    }

    const query =
        'SELECT * FROM teaching_academic_staff WHERE $1 = ANY(courses)';
    const res = await client.query(query, [course]);
    const tas = res.rows[0];

    return tas;
};

const getTimeDetails = ({
    miniCourseDetails,
    specSectionSched
}: {
    miniCourseDetails: any;
    specSectionSched: any;
}) => {
    let unitsPerClass = miniCourseDetails.units;
    let courseType = miniCourseDetails.type;
    let defaultEndTime = getEndTime({
        timeStart: 700,
        courseType,
        unitsPerClass: unitsPerClass
    });
    let timeBlock = {
        start: '0700',
        end: defaultEndTime.toString()
    };
    let day = 'M';

    loop1: for (let i = 0; i < SCHOOL_DAYS.length; i++) {
        let daySched = specSectionSched[SCHOOL_DAYS[i]];

        let timeStart = 700; //0700
        let timeEnd = getEndTime({
            timeStart,
            courseType,
            unitsPerClass: unitsPerClass
        });

        if (daySched.length < 1) {
            timeBlock = {
                start: timeStart.toString(),
                end: timeEnd.toString()
            };
            day = SCHOOL_DAYS[i]
            break loop1;
        }

        let ascendingSched = daySched.sort(
            (schedBlock1: any, schedBlock2: any) => {
                return (
                    parseInt(schedBlock1.timeBlock.start, 10) -
                    parseInt(schedBlock2.timeBlock.start, 10)
                );
            }
        );

        for (let j = 0; j < ascendingSched.length - 1; j++) {
            // check if kasya
            // if ndi add sa time start ung time end ng current class

            // dapat nakabase den sa next class
            if (
                (timeStart >= ascendingSched[j].timeBlock.start && timeStart <= ascendingSched[j].timeBlock.end) ||
                (timeEnd >= ascendingSched[j].timeBlock.start && timeEnd <= ascendingSched[j].timeBlock.end) ||
                (timeStart >= ascendingSched[j + 1].timeBlock.start && timeStart <= ascendingSched[j + 1].timeBlock.end) ||
                (timeEnd >= ascendingSched[j + 1].timeBlock.start && timeEnd <= ascendingSched[j + 1].timeBlock.end) 
            ) {
                timeStart = parseInt(daySched[j].timeBlock.end);
                timeEnd = getEndTime({
                    timeStart,
                    courseType,
                    unitsPerClass: unitsPerClass
                });
                continue;
            }

            timeBlock = {
                start: timeStart.toString(),
                end: timeEnd.toString()
            };
            day = SCHOOL_DAYS[i]

            break loop1;
        }
    }

    return {timeBlock, day}
};
