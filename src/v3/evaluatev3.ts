import { SCHOOL_DAYS } from "../constants";
import { chromosome } from "../data";

const evaluateRoomAssignment = ({chromosome}: {chromosome: any}) => {

    let roomSchedule = classToRoomSchedule(chromosome);

    console.log('rs', roomSchedule)
}

const classToRoomSchedule = (chromosome: any) => {

    let roomSchedule: any = {};

    let departmentKeys = Object.keys(chromosome);
    for (let i = 0; i < departmentKeys.length; i++){
        let departmentSched = chromosome[departmentKeys[i]];

        let yearKeys = Object.keys(departmentSched);
        for (let j = 0; j < yearKeys.length; j++){
            let yearSched = departmentSched[yearKeys[j]];

            let classKeys = Object.keys(yearSched);
            for (let k = 0; k < classKeys.length; k++){
                let classSched = yearSched[classKeys[k]];

                for (let m = 0; m < SCHOOL_DAYS.length; m++){
                    let daySched = classSched[SCHOOL_DAYS[m]];

                    if (!daySched){
                        continue;
                    }

                    for (let n = 0; n < daySched.length; n++){
                        let schedBlock = daySched[n];

                        let roomId = schedBlock.room.room_id;

                        if (!roomSchedule[roomId]){
                            roomSchedule[roomId] = {
                                M: [],
                                T: [],
                                W: [],
                                TH: [],
                                F: [],
                                S: []
                            }
                        }

                        roomSchedule[roomId][SCHOOL_DAYS[m]].push({...schedBlock, section: classKeys[k], year: yearKeys[j]})
                    }
                }
            }
        }
    }

    return roomSchedule;
}

export const evaluateV3 = ({chromosome, semester}: {chromosome: any, semester: number}) => {
    evaluateRoomAssignment({chromosome})
}