// generate pero timeblocks and courses lng
//   - eto ung iccross over multiple times para marami like possible something
//   - tapos saka mag aassign sa baba

import { Client } from "pg";

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
//     csc: 'datasci'
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

const generateV3 = async ({
    department,
    year,
    sectionSpecializations
}: {
    department: string;
    year: number;
    sectionSpecializations: any;
}) => {
    let specializationsAndSections: any = {}
    let specializationsAndCurriculum: any = {}

    // group sectionSpecializations by specialization not section
    let sectionKeys = Object.keys(sectionSpecializations);
    for (let i = 0; i < sectionKeys.length; i++){
        if (!specializationsAndSections[sectionKeys[i]]){
            specializationsAndSections[sectionKeys[i]] = []
        }

        specializationsAndSections[sectionKeys[i]].push(sectionKeys[i])
    }

    // get curriculum per year per department per specialization
    let specializations = Object.keys(specializationsAndSections)

    if (specializations.length > 0){
        for (let i = 0; i < specializations.length; i++){
            const query = 'SELECT courses FROM curriculum WHERE department = $1 AND year = $2 AND specialization = $3'
            const res = await client.query(query, [department, year, specializations[i]])
            const curriculum = res.rows[0].curriculum
            
            specializationsAndCurriculum[specializations[i]] = curriculum;
        }
    }else{
        const query = 'SELECT courses FROM curriculum WHERE department = $1 AND year = $2'
        const res = await client.query(query, [department, year])
        const curriculum = res.rows[0].curriculum

        specializationsAndCurriculum['all'] = curriculum;
    }

};
