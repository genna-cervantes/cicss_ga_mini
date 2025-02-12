import { SCHOOL_DAYS } from './constants';
import { evaluateFast, groupSchedByRoom } from './evaluate';
import { generateChromosomeV2, getEndTime } from './generateV2';

export const runGAV2 = async ({ semester }: { semester: 2 }) => {
    let population: {
        id: number;
        chromosome: any;
        score: number;
        violations: [
            { violationName: string; violationCount: number; violations: any }
        ];
    }[] = [];

    console.log('Generating initial population...');
    for (let i = 0; i < 10; i++) {
        const chromosome = await generateChromosomeV2();
        const { score, violationTracker } = await evaluateFast({
            chromosome,
            semester
        }); // do this ha kasi marami rin time toh nicconsume tapusin ung evaluate fast
        population.push({
            chromosome,
            score,
            violations: violationTracker,
            id: i
        });

        // console.log(i, score, violationTracker)
    }

    const findTop50 = (
        array: {
            chromosome: any;
            id: number;
            score: number;
            violations: [
                {
                    violationName: string;
                    violationCount: number;
                    violations: any;
                }
            ];
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

        const { score: score1, violationTracker: violationType1 } =
            await evaluateFast({ chromosome: newChromosome1, semester });
        population.push({
            chromosome: newChromosome1,
            score: score1,
            violations: violationType1,
            id: 100 + i
        });

        const { score: score2, violationTracker: violationType2 } =
            await evaluateFast({ chromosome: newChromosome2, semester });
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

    // run repair functions for each one in population
    population.forEach((val) => {
        switch (mostProminentProblem) {
            case 'course_assignment':
                break;
            case 'room_assignment':
                repairRoomAssignment(val); // new populationo every repair
                break;
            case 'room_type_assignment':
                break;
            case 'tas_assignment':
                break;
            case 'tas_type_assignment':
                break;
            case 'tas_load':
                break;
            case 'max_class_day_length_assignment':
                break;
            case 'consecutive_class_hours':
                break;
            case 'gened_course_assignment':
                break;
            case 'courses_assigned_in_a_day':
                break;
            case 'allowed_specific_days':
                break;
            case 'allowed_number_of_days':
                break;
            case 'rest_days':
                break;
            case 'tas_requests':
                break;
            case 'room_proximity':
                break;
        }
    });

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
                violationName: string;
                violationCount: number;
                violations: any;
            }
        ];
    }[]
) => {
    console.log(population.length);

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
            violations: [
                {
                    violationName: string;
                    violationCount: number;
                    violations: any;
                }
            ];
        }) => {
            let violations = val.violations;

            violations.forEach(
                (v: {
                    violationName: string;
                    violationCount: number;
                    violations: any;
                }) => {
                    violationCount[
                        v.violationName as keyof typeof violationCount
                    ] += v.violationCount;
                }
            );

            //     violationCount[v.violationName as keyof typeof violationCount] += v.violationCount;
        }
    );

    let violationKeys = Object.keys(violationCount);

    let maxViolationCount = -999;
    let maxViolationKey = '';
    violationKeys.forEach((vk: string) => {
        if (
            violationCount[vk as keyof typeof violationCount] >
            maxViolationCount
        ) {
            maxViolationCount =
                violationCount[vk as keyof typeof violationCount];
            maxViolationKey = vk;
        }
    });

    console.log(violationCount);
    console.log(maxViolationKey);

    return maxViolationKey;
};

const repairRoomAssignment = (val: {
    id: number;
    chromosome: any;
    score: number;
    violations: [
        {
            violationName: string;
            violationCount: number;
            violations: any;
        }
    ];
}) => {
    // start here tomo

    // loop thru the schedule
    // check if violation sa sched block na un - thru the array
    // resolve by changing THAT ONE to a possible kapalit -> another loop to check with all other scheds (shet) -> room order para di masyado maloop
    // do until wala na OR until matapos lahat nung scheds

    // sort ko by room ung violations -
    // sort ko by room ung sched mismo

    // loop thru the room schedule
    // check kung may violations ba sa room na un
    // try to solve the violations IN THE SAME ROOM FIRST
    // if mag fail try sa next room

    let sortedRoomViolations: any = {};
    let sortedRoomSchedule = groupSchedByRoom(val.chromosome);

    let violations = getSpecificViolation({
        val,
        violationName: 'room_assignment'
    });

    // sort the violations by room
    violations.forEach((v: any) => {
        if (sortedRoomViolations[v.room] == null) {
            sortedRoomViolations[v.room] = {
                M: [],
                T: [],
                W: [],
                TH: [],
                F: [],
                S: []
            };
        }
        sortedRoomViolations[v.room][v.day].push(v);
    });

    let roomKeys = Object.keys(sortedRoomSchedule);
    for (let i = 0; i < roomKeys.length; i++) {
        let roomKey = roomKeys[i];
        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            if (sortedRoomViolations[roomKey] == undefined) {
                continue;
            }

            if (
                (sortedRoomViolations[roomKey][SCHOOL_DAYS[j]]?.length ?? 0) < 1
            ) {
                // pwede kasi wala violation ung room
                continue;
            }

            // sort ascending by start time tapos adjust adjust nlng based sa overlap
            let daySched = sortedRoomSchedule[roomKey][SCHOOL_DAYS[j]];

            let ascendingSched = daySched.sort(
                (schedBlock1: any, schedBlock2: any) => {
                    return (
                        parseInt(schedBlock1.timeBlock.start, 10) -
                        parseInt(schedBlock2.timeBlock.start, 10)
                    );
                }
            );

            for (let k = 0; k < ascendingSched.length - 1; k++) {
                let schedBlock1 = ascendingSched[k];
                let schedBlock2 = ascendingSched[k + 1];

                resolveConflict({ schedBlock1, schedBlock2 });

                // check if sobra sa 2100 ung dulo

                console.log(ascendingSched)
                return;
            }
        }
    }
};

const resolveConflict = ({
    schedBlock1,
    schedBlock2
}: {
    schedBlock1: any;
    schedBlock2: any;
}) => {
    // check if may conflict
    console.log(schedBlock1);
    console.log(schedBlock2);

    if (
        parseInt(schedBlock2.timeBlock.start) >= parseInt(schedBlock1.timeBlock.start) &&
        parseInt(schedBlock2.timeBlock.start) <= parseInt(schedBlock1.timeBlock.end)
    ) {
        console.log(schedBlock2.timeBlock)

        let timeDifference =
            parseInt(schedBlock1.timeBlock.end) -
            parseInt(schedBlock2.timeBlock.start);

        // adjust next schedBlock
        schedBlock2.timeBlock.start = (parseInt(schedBlock2.timeBlock.start) + timeDifference).toString();
        console.log(schedBlock2.timeBlock)

        schedBlock2.timeBlock.end = getEndTime({
            timeStart: schedBlock2.timeBlock.start,
            courseType: schedBlock2.course.type,
            missingUnitsPerClass: schedBlock2.course.units
        }).toString();
    }
};

const getSpecificViolation = ({
    val,
    violationName
}: {
    val: {
        id: number;
        chromosome: any;
        score: number;
        violations: [
            {
                violationName: string;
                violationCount: number;
                violations: any;
            }
        ];
    };
    violationName: string;
}) => {
    let violations = val.violations;
    let specificViolations: any = [];

    violations.forEach(
        (v: {
            violationName: string;
            violationCount: number;
            violations: any;
        }) => {
            if (v.violationName === violationName) {
                specificViolations = v.violations;
            }
        }
    );

    return specificViolations;
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
