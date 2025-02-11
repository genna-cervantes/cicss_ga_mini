import { SCHOOL_DAYS } from './constants';
import { evaluate } from './evaluate';
import { generateChromosomeV2 } from './generateV2';

export const runGAV2 = async () => {
    let population: {
        id: number;
        chromosome: any;
        score: number;
        violations: [{ violationType: string; violationCount: number }];
    }[] = [];

    console.log('Generating initial population...');
    for (let i = 0; i < 100; i++) {
        const chromosome = await generateChromosomeV2();
        const { score, violationType } = await evaluate(chromosome); // do this ha kasi marami rin time toh nicconsume tapusin ung evaluate fast
        population.push({
            chromosome,
            score,
            violations: violationType,
            id: i
        });
    }

    const findTop50 = (
        array: {
            chromosome: any;
            id: number;
            score: number;
            violations: [{ violationType: string; violationCount: number }];
        }[]
    ) => {
        return array
            .sort((a, b) => b.score - a.score) // Sort by score in descending order
            .slice(0, 50); // Get the top 50
    };

    console.log(population.length);
    let ogtop50 = findTop50(population);
    let ogtop50ids = [];

    for (let i = 0; i < ogtop50.length; i++) {
        ogtop50ids.push(ogtop50[i].id);
    }

    population = ogtop50.slice(0);

    // cross over
    let halfOfTop = population.length / 2;
    for (let i = 0; i < halfOfTop; i++) {
        // half ng top 50
        console.log('peforming crossover');

        // try with i + 1 if better ung result
        let parent1 = population[i].chromosome;
        let parent2 = population[halfOfTop + i].chromosome;

        // generate this crossover point until is
        // should depend on how many sections per year - randomize from 1 to num of sections - 1

        let crossoverPoint = {
            cs_1st: 2,
            cs_2nd: 1,
            cs_3rd: 2,
            cs_4th: 2
        };

        let { newChromosome1, newChromosome2 } = crossover({
            parent1,
            parent2,
            crossoverPoint
        });

        const { score: score1, violationType: violationType1 } =
            await evaluate(newChromosome1);
        population.push({
            chromosome: newChromosome1,
            score: score1,
            violations: violationType1,
            id: 100 + i
        });

        const { score: score2, violationType: violationType2 } =
            await evaluate(newChromosome2);
        population.push({
            chromosome: newChromosome2,
            score: score2,
            violations: violationType2,
            id: 100 + i
        });

        console.log(
            `done with crossover with parent${i} and parent${population.length / 2 + i}`
        );
    }

    // whats the most prominent problem
    let mostProminentProblem = checkMostProminentProblem(population);

    // repair functions before finding top 50 again

    let newtop50 = findTop50(population);
    // population = top50;

    // return {
    //     schedule: top50[0].chromosome,
    //     score: top50[0].score,
    //     violations: top50[0].violations
    // };
    let newtop50ids = [];

    for (let i = 0; i < newtop50.length; i++) {
        newtop50ids.push(newtop50[i].id);
    }

    return {
        newtop50ids,
        ogtop50ids
    };
};

const checkMostProminentProblem = (
    population: {
        id: number;
        chromosome: any;
        score: number;
        violations: [
            {
                violationType: string;
                violationCount: number;
            }
        ];
    }[]
) => {
    let violationCount = {
        course_assignment: 0,
        room_assignment: 0,
        room_type_assignment: 0,
        tas_assignment: 0,
        tas_type_assignment: 0,
        tas_load: 0,
        max_class_day_length_assignment: 0,
        consecutive_class_hours: 0,
        gened_course_assignment: 0,
        courses_assigned_in_a_day: 0,
        allowed_specific_days: 0,
        allowed_number_of_days: 0,
        rest_days: 0,
        tas_requests: 0,
        room_proximity: 0
    };

    population.forEach(
        (val: {
            id: number;
            chromosome: any;
            score: number;
            violations: [{ violationType: string; violationCount: number }];
        }) => {
            let violations = val.violations;

            violations.forEach((v: {
                violationType: string;
                violationCount: number;
            }) => {
                violationCount[v.violationType as keyof typeof violationCount] += v.violationCount;
            })

        }
    );

    let violationKeys = Object.keys(violationCount);

    let maxViolationCount = -999;
    let maxViolationKey = '';
    violationKeys.forEach((vk: string) => {
        if (violationCount[vk as keyof typeof violationCount] > maxViolationCount){
            maxViolationCount = violationCount[vk as keyof typeof violationCount]
            maxViolationKey = vk
        }
    })

    console.log(violationCount)

    return maxViolationKey;
};

const crossover = ({
    parent1,
    parent2,
    crossoverPoint
}: {
    parent1: any;
    parent2: any;
    crossoverPoint: any;
}) => {
    let parent1Copy = structuredClone(parent1);

    let newChromosome1 = structuredClone(parent1);
    let newChromosome2 = structuredClone(parent2);
    let copyOfParent2 = structuredClone(parent2);

    // console.log('parent1', parent1);
    // console.log('nc', newChromosome1);
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

        // console.log('og sched', yearAndDepartmentSchedule)

        let parent1MinusCrossOverPoint = parent1Copy[i][
            yearAndDepartmentKey
        ].splice(crossoverPoint[yearAndDepartmentKey]);

        // console.log('crossover sched', parent1MinusCrossOverPoint)

        for (let j = 0; j < parent1MinusCrossOverPoint.length; j++) {
            let specSection = parent1MinusCrossOverPoint[j];
            let specSectionKey = Object.keys(specSection)[0];
            let specSectionSchedule = specSection[specSectionKey];

            for (let k = 0; k < SCHOOL_DAYS.length; k++) {
                let daySched = specSectionSchedule[SCHOOL_DAYS[k]];

                for (let l = 0; l < daySched.length; l++) {
                    let schedBlock = daySched[l];
                    let sectionIndex =
                        letterToIndex(specSectionKey.slice(-1)) - 1;

                    // find the schedule in parent 2
                    let retClassInSched = findClassInSchedule({
                        courseCode: schedBlock.course.subject_code,
                        newChromosome2: newChromosome2, // ang ibigay is ung nababawasan
                        parent2: copyOfParent2, // ang ibigay is ung nababawasan
                        newTimeBlock: schedBlock.timeBlock,
                        newDay: SCHOOL_DAYS[k],
                        crossoverPoint
                    });

                    if (retClassInSched == null) {
                        // skip this sched since wala siya kapalitan
                        continue;
                    }

                    copyOfParent2 = retClassInSched.parent2Copy;
                    let newDay = retClassInSched.day;
                    let newTimeBlock = retClassInSched.newTimeBlock;
                    let specSectionSwitched = retClassInSched.sectionSwitched;
                    let specSectionIndex =
                        letterToIndex(specSectionSwitched.slice(-1)) - 1;

                    // add the new timeblock
                    newChromosome1[i][yearAndDepartmentKey][sectionIndex][
                        specSectionKey
                    ][newDay].push({
                        ...schedBlock,
                        timeBlock: newTimeBlock
                    });

                    // remove the previous timeblock
                    newChromosome1[i][yearAndDepartmentKey][sectionIndex][
                        specSectionKey
                    ][SCHOOL_DAYS[k]].splice(l, 1);

                    // console.log('checking if nag switch nga')
                    // console.log('parent 1 loc')
                    // console.log('day', SCHOOL_DAYS[k])
                    // console.log('section', specSectionKey)
                    // console.log(parent1[i][yearAndDepartmentKey][sectionIndex][specSectionKey][SCHOOL_DAYS[k]][l])

                    // console.log('parent 2 loc')
                    // console.log('day', newDay)
                    // console.log('section', specSectionSwitched)
                    // console.log({
                    //     ...schedBlock,
                    //     timeBlock: newTimeBlock
                    // })

                    // console.log('chromosome 1 should contain parent 2 loc')
                    // console.log('day', newDay)
                    // console.log(newChromosome1[i][yearAndDepartmentKey][sectionIndex][specSectionKey][newDay])

                    // console.log('chromosome 2 should contain parent 1 loc')
                    // console.log('day', SCHOOL_DAYS[k])
                    // console.log(newChromosome2[i][yearAndDepartmentKey][specSectionIndex][specSectionSwitched][SCHOOL_DAYS[k]])

                    // return;
                }
            }
        }
    }

    return {
        newChromosome1,
        newChromosome2
    };
};

const findClassInSchedule = ({
    courseCode,
    newChromosome2,
    parent2,
    newTimeBlock,
    newDay,
    crossoverPoint
}: {
    courseCode: string;
    newChromosome2: any;
    parent2: any;
    newTimeBlock: any;
    newDay: any;
    crossoverPoint: any;
}) => {
    let parent2OgCopy = structuredClone(parent2);
    let parent2Copy = structuredClone(parent2);

    for (let i = 0; i < parent2.length; i++) {
        let perYear = parent2[i];
        let yearAndDepartmentKey = Object.keys(perYear)[0];
        let yearAndDepartmentSchedule = perYear[yearAndDepartmentKey];

        let parent2MinusCrossOverPoint = parent2OgCopy[i][
            yearAndDepartmentKey
        ].splice(0, crossoverPoint[yearAndDepartmentKey]);

        for (let j = 0; j < parent2MinusCrossOverPoint.length; j++) {
            let specSection = parent2MinusCrossOverPoint[j];
            let specSectionKey = Object.keys(specSection)[0];
            let specSectionSchedule = specSection[specSectionKey];

            for (let k = 0; k < SCHOOL_DAYS.length; k++) {
                let daySched = specSectionSchedule[SCHOOL_DAYS[k]];

                for (let l = 0; l < daySched.length; l++) {
                    let schedBlock = daySched[l];
                    let sectionIndex =
                        letterToIndex(specSectionKey.slice(-1)) - 1;

                    if (schedBlock.course.subject_code === courseCode) {
                        // let schedBlockInNewChromosome2 =
                        //     newChromosome2[i][yearAndDepartmentKey][j][
                        //         specSectionKey
                        //     ][SCHOOL_DAYS[k]][l];

                        // add ung new timeblock from chromosome1 to chromosome2
                        newChromosome2[i][yearAndDepartmentKey][sectionIndex][
                            specSectionKey
                        ][newDay].push({
                            ...schedBlock,
                            timeBlock: newTimeBlock
                        });

                        // remove ung previous timeblock from chromosome 2
                        newChromosome2[i][yearAndDepartmentKey][sectionIndex][
                            specSectionKey
                        ][SCHOOL_DAYS[k]].splice(l, 1);

                        // remove sa parent2 copy para madali maghanap ng remaining courses na ndi pa nasswitch
                        parent2Copy[i][yearAndDepartmentKey][sectionIndex][
                            specSectionKey
                        ][SCHOOL_DAYS[k]].splice(l, 1);

                        return {
                            day: SCHOOL_DAYS[k],
                            newTimeBlock: schedBlock.timeBlock,
                            parent2Copy,
                            sectionSwitched: specSectionKey
                        };
                    }
                }
            }
        }
    }
};

const letterToIndex = (letter: string) => {
    return letter.toLowerCase().charCodeAt(0) - 96;
};
