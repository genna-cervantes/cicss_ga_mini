import { SCHOOL_DAYS } from './constants';
import { evaluate } from './evaluate';
import { generateChromosomeV2 } from './generateV2';

export const runGAV2 = async () => {
    let population: {
        chromosome: any;
        score: number;
        violations: [{ violationType: string; violationCount: number }];
    }[] = [];

    console.log('Generating initial population...');
    for (let i = 0; i < 10; i++) {
        const chromosome = await generateChromosomeV2();
        const { score, violationType } = await evaluate(chromosome);
        population.push({ chromosome, score, violations: violationType });
    }

    const findTop50 = (
        array: {
            chromosome: any;
            score: number;
            violations: [{ violationType: string; violationCount: number }];
        }[]
    ) => {
        return array
            .sort((a, b) => b.score - a.score) // Sort by score in descending order
            .slice(0, 50); // Get the top 50
    };

    const top50 = findTop50(population);
    population = top50;

    // cross over
    for (let i = 0; i < population.length / 2; i++) {
        console.log('peforming crossover');

        let parent1 = population[i].chromosome;
        let parent2 = population[population.length / 2 + i].chromosome;

        crossover({ parent1, parent2 });
    }

    return {
        schedule: top50[0].chromosome,
        score: top50[0].score,
        violations: top50[0].violations
    };
};

const crossover = ({ parent1, parent2 }: { parent1: any; parent2: any }) => {
    let newChromosome1 = structuredClone(parent1);
    let newChromosome2 = structuredClone(parent2);
    let copyOfParent2 = structuredClone(parent2);

    console.log('parent1', parent1);
    console.log('nc', newChromosome1);
    // loop thru parent 1
    // check the subject
    // get the schedule of that subject in parent 2
    // swap the schedules
    // remove that from the copy in parent2 para not maulit
    // return parent1 and parent2

    // loop per room per day
    for (let i = 0; i < parent1.length; i++) {
        let perYear = parent1[i];
        let yearAndDepartmentKey = Object.keys(perYear)[0];
        let yearAndDepartmentSchedule = perYear[yearAndDepartmentKey];

        for (let j = 0; j < yearAndDepartmentSchedule.length; j++) {
            let specSection = yearAndDepartmentSchedule[j];
            let specSectionKey = Object.keys(specSection)[0];
            let specSectionSchedule = specSection[specSectionKey];

            for (let k = 0; k < SCHOOL_DAYS.length; k++) {
                let daySched = specSectionSchedule[SCHOOL_DAYS[k]];

                for (let l = 0; l < daySched.length; l++) {
                    let schedBlock = daySched[l];

                    // let schedBlockInNewChromosome1 =
                    //     newChromosome1[i][yearAndDepartmentKey][j][
                    //         specSectionKey
                    //     ][SCHOOL_DAYS[k]][l];

                    // find the schedule in parent 2
                    let retClassInSched = findClassInSchedule({
                        courseCode: schedBlock.course.subject_code,
                        newChromosome2: newChromosome2, // ang ibigay is ung nababawasan
                        parent2: copyOfParent2, // ang ibigay is ung nababawasan
                        newTimeBlock: schedBlock.timeBlock,
                        newDay: SCHOOL_DAYS[k]
                    });

                    if (retClassInSched == null){
                        // skip this sched since wala siya kapalitan
                        continue;
                    }

                    copyOfParent2 = retClassInSched.parent2Copy;
                    let newDay = retClassInSched.day
                    let newTimeBlock = retClassInSched.newTimeBlock

                    // add the new timeblock
                    newChromosome1[i][yearAndDepartmentKey][j][specSectionKey][newDay].push({
                        ...schedBlock,
                        timeBlock: newTimeBlock
                    })

                    // remove the previous timeblock
                    newChromosome1[i][yearAndDepartmentKey][j][specSectionKey][SCHOOL_DAYS[k]].splice(l, 1);

                    console.log('checking if nag switch nga')
                    console.log('parent 1 loc')
                    console.log('day', SCHOOL_DAYS[k])
                    console.log(parent1[i][yearAndDepartmentKey][j][specSectionKey][SCHOOL_DAYS[k]][l])
                    
                    console.log('parent 2 loc')
                    console.log('day', newDay)
                    console.log({
                        ...schedBlock,
                        timeBlock: newTimeBlock
                    })
                    
                    console.log('chromosome 1 should contain parent 2 loc')
                    console.log('day', newDay)
                    console.log(newChromosome1[i][yearAndDepartmentKey][j][specSectionKey][newDay])
                    
                    console.log('chromosome 2 should contain parent 1 loc')
                    console.log('day', SCHOOL_DAYS[k])
                    console.log(newChromosome2[i][yearAndDepartmentKey][j][specSectionKey][SCHOOL_DAYS[k]])

                    return;
                }
            }
        }
    }
};

const findClassInSchedule = ({
    courseCode,
    newChromosome2,
    parent2,
    newTimeBlock,
    newDay
}: {
    courseCode: string;
    newChromosome2: any;
    parent2: any;
    newTimeBlock: any;
    newDay: any
}) => {
    let parent2Copy = structuredClone(parent2);

    for (let i = 0; i < parent2.length; i++) {
        let perYear = parent2[i];
        let yearAndDepartmentKey = Object.keys(perYear)[0];
        let yearAndDepartmentSchedule = perYear[yearAndDepartmentKey];

        for (let j = 0; j < yearAndDepartmentSchedule.length; j++) {
            let specSection = yearAndDepartmentSchedule[j];
            let specSectionKey = Object.keys(specSection)[0];
            let specSectionSchedule = specSection[specSectionKey];

            for (let k = 0; k < SCHOOL_DAYS.length; k++) {
                let daySched = specSectionSchedule[SCHOOL_DAYS[k]];

                for (let l = 0; l < daySched.length; l++) {
                    let schedBlock = daySched[l];

                    if (schedBlock.course.subject_code === courseCode) {
                        // let schedBlockInNewChromosome2 =
                        //     newChromosome2[i][yearAndDepartmentKey][j][
                        //         specSectionKey
                        //     ][SCHOOL_DAYS[k]][l];

                        // add ung new timeblock from chromosome1 to chromosome2
                        newChromosome2[i][yearAndDepartmentKey][j][specSectionKey][newDay].push({
                            ...schedBlock,
                            timeBlock: newTimeBlock
                        })

                        // remove ung previous timeblock from chromosome 2
                        newChromosome2[i][
                            yearAndDepartmentKey
                        ][j][specSectionKey][
                            SCHOOL_DAYS[k]
                        ].splice(l, 1);
                        
                        // remove sa parent2 copy para madali maghanap ng remaining courses na ndi pa nasswitch
                        parent2Copy[i][
                            yearAndDepartmentKey
                        ][j][specSectionKey][
                            SCHOOL_DAYS[k]
                        ].splice(l, 1);

                        return {
                            day: SCHOOL_DAYS[k],
                            newTimeBlock: schedBlock.timeBlock,
                            parent2Copy
                        };
                    }
                }
            }
        }
    }
};
