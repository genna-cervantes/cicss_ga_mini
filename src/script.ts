import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

// GA
// chromosome generation
const SCHOOL_DAYS = ['M', 'T', 'W', 'TH', 'F', 'S'];
const SCHOOL_HOURS = {
    start: "0700",
    end: "2100"
}

const DB_HOST = "localhost";
const DB_PORT = 5432;
const DB_USER = "postgres";
const DB_PASSWORD = "password";
const DB_NAME = "postgres";

const client = new Client({
  host: DB_HOST,
  port: DB_PORT, // Use a default port if not specified
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});

// Connect to PostgreSQL
client
  .connect()
  .then(() => {
    console.log("Connected to PostgreSQL database");
  })
  .catch((err) => {
    console.error("Connection error", err.stack);
  });

let chromosomes = [];

const generateClassGene = async ({
  dept,
  year,
  sem,
  sections,
}: {
  dept: string;
  year: number;
  sem: number;
  sections: number;
}) => {
  // need curriculum dept year sem
  try {
    // Using parameterized query to avoid SQL injection
    const query =
      "SELECT * FROM curriculum WHERE department = $1 AND year = $2 AND semester = $3 LIMIT 1";
    const res = await client.query(query, [dept, year, sem]);

    const curriculum = res.rows[0];
    const specialization = curriculum.specialization;
    const courses = curriculum.courses;
    const yearLevelRestrictions = {
      M: {
        start: "1700",
        end: "2100",
      },
      T: {
        start: "1700",
        end: "2100",
      },
      W: {
        start: "1700",
        end: "2100",
      },
      TH: {
        start: "1700",
        end: "2100",
      },
      F: {
        start: "1700",
        end: "2100",
      },
      S: {
        start: "0700",
        end: "2100",
      },
    };

    console.log(curriculum);
    console.log(specialization);
    console.log(courses);

    // track course units 
    let weeklyCourseUnits: any = {}
    
    // track prof units 
    let weeklyProfUnits = {}

    // loop through sections
    for (let i = 0; i < sections; i++) {
        // let classSchedule = {
        //     'M': null,
        //     'T': null,
        //     'W': null,
        //     'TH': null,
        //     'F': null,
        //     'S': null,
        // };

        // loop thru school days
        for (let j = 0; j < SCHOOL_DAYS.length; j++){
            let scheduleBlock;
            let courseAssigned = false;

            // Try to assign a valid course for the current day
            while (!courseAssigned) {
                // get random course
                let course = courses[Math.floor(Math.random() * courses.length)];
                // check if pwede pa from the course units
                let assignedUnits = weeklyCourseUnits[course]?.units || 0;
                if (assignedUnits >= course.units){
                    // choose another random course not continue kasi its the next school day na if continue
                    continue;
                }

                courseAssigned = true;
                let courseDetails = await getCourseDetails(course);
                console.log('cousre details: ', courseDetails);

                // add sa units nung prof
                weeklyCourseUnits[course].units += courseDetails.units;

                // get prof for course
                let prof = await getProfFromCourse({courseDetails, weeklyProfUnits, dept});
                console.log('profs: ', prof);

                
                // get room for course
                let room = getRoomFromCourse({course});
                
                // get random time slot for course
                let timeBlock = getTimeBlockFromCourse({course});
            }
            
            // assign everything to that section
            // add to yearlevel gene
        }
    }
  } catch (err) {
    console.error("Error executing query", err);
  }
};

generateClassGene({ dept: "CS", year: 1, sem: 1, sections: 2 });

const getCourseDetails = async (course: string) => {
    const query =
      "SELECT * FROM courses WHERE subject_code = $1 LIMIT 1";
    const res = await client.query(query, [course]);
    return res.rows[0];
}

const getProfFromCourse = async ({courseDetails, weeklyProfUnits, dept}: {courseDetails: any, weeklyProfUnits: any, dept: string}) => {
    // ung main dep lng muna kunin
    const query =
      "SELECT * FROM professors WHERE $1 = ANY(courses) AND main_department = $2";
    const res = await client.query(query, [courseDetails.subject_code, dept]);

    const mainAvailableProfs = res.rows;

    let profAssigned = false;
    let tries = 0;
    // Try to assign a valid course for the current day
    while (!profAssigned) {
        // pick random don
        let prof = mainAvailableProfs[Math.floor(Math.random() * mainAvailableProfs.length)];
        tries++;

        if (tries >= 10){
            // wala n tlga beh
            break;
        }
    
        // check if pasok sa units nila
        let assignedUnits = weeklyProfUnits[prof.professor_id]?.units || 0;
        if (assignedUnits >= prof.units){
            continue;
        }

        // add sa units nung prof
        weeklyProfUnits[prof.professor_id].units += courseDetails.units;

        // return ung prof na un
        return prof;
    }

    // pag wala sa main dep kuha sa iba except ung main dep para di maulit
    const query2 =
      "SELECT * FROM professors WHERE $1 = ANY(courses) AND main_department != $2";
    const res2 = await client.query(query, [courseDetails.subject_code, dept]);

    const subAvailableProfs = res2.rows;

    let profAssigned2 = false;
    let tries2 = 0;
    // Try to assign a valid course for the current day
    while (!profAssigned) {
        // pick random don
        let prof = mainAvailableProfs[Math.floor(Math.random() * mainAvailableProfs.length)];
        tries2++;

        if (tries2 >= 10){
            // wala n tlga beh
            break;
        }
    
        // check if pasok sa units nila
        let assignedUnits = weeklyProfUnits[prof.professor_id]?.units || 0;
        if (assignedUnits >= prof.units){
            continue;
        }

        // add sa units nung prof
        weeklyProfUnits[prof.professor_id].units += courseDetails.units;

        // return ung prof na un
        return prof;
    }

    return null;
}

const getRoomFromCourse = ({course}: {course: any}) => {

}

const getTimeBlockFromCourse = ({course}: {course: any}) => {

}

// mini gene

// cs it is - 1 year level muna and 2 sections per dept

// 1cs - 3 subjects
// comp prog 1 - lab - major
// linear algebra - lec - major
// PE - gened
// thy - lec - gened

// 1it - 3 subjects
// networking 1 - lab - major
// comp prog 1 - lab - major
// PE - gened
// thy - lec -gened

// 1is - 3 subjects
// fundamentals of information systems - lec - major
// comp prog 1 - lab - major
// PE - gened
// thy - lec - gened

// professors

// Darlene Alberto
// comp prog 1
// full time
// load 24
// restrictions - wala
// main dep - cs

// Lawrence Decamora
// comp prog 1
// full time
// load 24
// restrictions - until 4 pm lang
// main dep - cs

// Jonathan Cabero
// linear algebra
// full time
// load 24
// restrictions
// main dep - cs

// Cherry Estabillo
// linear algebra
// full time
// load 24
// restrictions
// main dep - cs

// Random Name0
// comp prog 1
// full time
// load 24
// restrictions
// main dep - it

// Random Name1
// networking 1
// full time
// load 24
// restrictions
// main dep - it

// Random Name2
// networking 1
// part time
// load 12
// restrictions - bawal siya saturday
// main dep - it

// Random Name0
// comp prog 1
// full time
// load 24
// restrictions
// main dep - is

// Random Name3
// fundamentals of info sys
// full time
// load 24
// restrictions
// main dep - is

// Random Name4
// fundamentals of info sys
// full time
// load 24
// restrictions
// main dep - is

// rooms
// 1801 lab, 1802 - cs
// 1803 lab, 1804 - it
// 1805 lab, 1806 - is
