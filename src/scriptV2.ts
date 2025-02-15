import { SCHOOL_DAYS } from './constants';
import { evaluateFast, groupSchedByRoom } from './evaluate';
import { generateChromosomeV2, getEndTime } from './generateV2';

const findTop10 = (
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
        .slice(0, 10); // Get the top 10
};

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

    // find top 50
    // population = findTop50(population);

    let maxGenerations = 10;
    let generations = 0;
    loop1:
    while (generations < maxGenerations) {
        console.log(population[0].id);
        console.log(population[0].score);

        generations++;
        console.log(population.length);

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

            // console.log(
            //     `done with crossover with parent${i} and parent${population.length / 2 + i}`
            // );
        }

        console.log('problem solving');
        // whats the most prominent problem
        let mostProminentProblem = checkMostProminentProblem(population);

        // run repair functions for each one in population
        for (let i = 0; i < population.length; i++) {
            let val = population[i];

            // repair functions before finding top 50 again
            switch (mostProminentProblem) {
                case 'course_assignment':
                    break;
                case 'room_assignment':
                    val.chromosome = repairRoomAssignment(val); // new populationo every repair
                    break;
                case 'room_type_assignment':
                    break;
                case 'tas_assignment':
                    // imbes na imove ung time
                    // hanap ng ibang prof n pwede don sa subj na un
                    val.chromosome = repairTASAssignment(val)

                    // if wala saka lng change ng time
                    break loop1;
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
        }

        // evaluate again after performing repair
        for (let i = 0; i < population.length; i++) {
            let val = population[i];
            let { score: newScore, violationTracker: newViolationTracker } =
                await evaluateFast({ chromosome: val.chromosome, semester });
            val = {
                ...val,
                score: newScore,
                violations: newViolationTracker
            };
            population[i] = val;
        }

        population = findTop10(population);

        console.log(population[0].id);
        console.log(population[0].score);
    }

    // let { score: score3, violationTracker: violationTracker3 } = await evaluateFast({chromosome: population[0].chromosome, semester})

    // return {
    //     chromosome: population[0].chromosome,
    //     score: score3,
    //     violation: violationTracker3
    // };

    let newtop50 = findTop10(population);

    // population = top50;

    // return {
    //     schedule: top50[0].chromosome,
    //     score: top50[0].score,
    //     violations: top50[0].violations
    // };

    // evaluate again
    let { score: newScore, violationTracker: newViolationTracker } =
        await evaluateFast({ chromosome: newtop50[0].chromosome, semester });

    return {
        chromosome: newtop50[0].chromosome,
        score: newScore,
        violation: newViolationTracker
    };
};

const repairTASAssignment = (val: {
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
    let violations = getSpecificViolation({
        val,
        violationName: 'tas_assignment'
    });
    let sortedTASViolations;

    console.log(violations)

    violations.forEach((v: any) => {
        if (sortedTASViolations[v.TAS.tas_id] == null) {
            sortedTASViolations[v.TAS.tas_id] = {
                M: [],
                T: [],
                W: [],
                TH: [],
                F: [],
                S: []
            };
        }
        sortedTASViolations[v.TAS.tas_id][v.day].push(v);
    });


    // sort ung violation array by day

    // loop thru chromosome
    // check sa violation array kung same ng start time course and prof
    // dito na hanap ng ibang prof for that coures na available sa time slot na un

    // helper function check if available ung prof na un sa time na un
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
    // console.log(population.length);

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

    loop1: for (let i = 0; i < roomKeys.length; i++) {
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

            // console.log(roomKey);
            // console.log(SCHOOL_DAYS[j]);
            for (let k = 0; k < ascendingSched.length - 1; k++) {
                let schedBlock1 = ascendingSched[k];
                let schedBlock2 = ascendingSched[k + 1];

                resolveConflict({ schedBlock1, schedBlock2 });
            }
        }
    }

    // ung kapag sobra sa class -> pero kasama na un sa max class day length na repair
    let roomsOverBooked: any = {
        M: [],
        T: [],
        W: [],
        TH: [],
        F: [],
        S: []
    };

    let roomsWithSlots: any = {
        M: [],
        T: [],
        W: [],
        TH: [],
        F: [],
        S: []
    };

    let roomsWithSlotsScheds: any = {
        M: {},
        T: {},
        W: {},
        TH: {},
        F: {},
        S: {}
    };

    let roomsOverBookedScheds: any = {
        M: {},
        T: {},
        W: {},
        TH: {},
        F: {},
        S: {}
    };

    ({
        roomsWithSlots,
        roomsOverBooked,
        roomsWithSlotsScheds,
        roomsOverBookedScheds
    } = getOverBookedAndWithSlotsRooms({
        roomKeys,
        sortedRoomSchedule,
        roomsOverBooked,
        roomsOverBookedScheds,
        roomsWithSlots,
        roomsWithSlotsScheds
    }));

    // console.log('rooms overbooked start');
    // console.log(roomsOverBooked);
    // console.log(sortedRoomSchedule[roomsOverBooked['M'][0]]['M'])

    // tapos ung while is ung sa second loop so after icheck non irun ulet tong other for loop
    let tries = 0;
    while (
        (roomsOverBooked['M'].length > 0 ||
            roomsOverBooked['T'].length > 0 ||
            roomsOverBooked['W'].length > 0 ||
            roomsOverBooked['TH'].length > 0 ||
            roomsOverBooked['F'].length > 0 ||
            roomsOverBooked['S'].length > 0) &&
        tries < 10
    ) {
        // console.log('trying')
        // console.log(tries)
        for (let i = 0; i < SCHOOL_DAYS.length; i++) {
            let specDayRoomsWithoutSlotsKeys: any = Object.keys(
                roomsOverBookedScheds[SCHOOL_DAYS[i]]
            );

            if (
                !specDayRoomsWithoutSlotsKeys ||
                specDayRoomsWithoutSlotsKeys.length < 1
            ) {
                continue;
            }

            for (let j = 0; j < specDayRoomsWithoutSlotsKeys.length; j++) {
                // console.log(roomsOverBookedScheds)
                // console.log(specDayRoomsWithoutSlotsKeys)
                // console.log(specDayRoomsWithoutSlotsKeys[j])

                let lateClasses =
                    roomsOverBookedScheds[SCHOOL_DAYS[i]][
                        specDayRoomsWithoutSlotsKeys[j]
                    ];

                // console.log('late classes')
                // console.log(lateClasses)

                if (!lateClasses) {
                    continue;
                }

                loop3: for (let k = 0; k < lateClasses.length; k++) {
                    let specSched = lateClasses[k];
                    let hoursNeeded =
                        parseInt(specSched.timeBlock.end) -
                        parseInt(specSched.timeBlock.start);

                    for (
                        let l = 0;
                        l < roomsWithSlots[SCHOOL_DAYS[i]].length;
                        l++
                    ) {
                        // console.log('getting rooms with slots')
                        let specRoomKeyWithSlot =
                            roomsWithSlots[SCHOOL_DAYS[i]][l];
                        let daySchedWithSlot =
                            roomsWithSlotsScheds[SCHOOL_DAYS[i]][
                                specRoomKeyWithSlot
                            ];
                        let lastSchedBlock =
                            daySchedWithSlot[daySchedWithSlot.length - 1];

                        if (
                            2100 - parseInt(lastSchedBlock.timeBlock.end) >
                            hoursNeeded
                        ) {
                            // console.log('switching')
                            // console.log(
                            //     sortedRoomSchedule[specSched.room.room_id][
                            //         SCHOOL_DAYS[i]
                            //     ]
                            // );

                            // add to new day/room/whatever
                            let schedBlockToPush = {
                                ...specSched,
                                room: {
                                    ...daySchedWithSlot[0].room // new room
                                },
                                timeBlock: {
                                    start: lastSchedBlock.timeBlock.end,
                                    end: (
                                        parseInt(lastSchedBlock.timeBlock.end) +
                                        hoursNeeded
                                    ).toString()
                                }
                            };
                            // console.log(sortedRoomSchedule[lastSchedBlock.room.room_id][SCHOOL_DAYS[i]])

                            sortedRoomSchedule[lastSchedBlock.room.room_id][
                                SCHOOL_DAYS[i]
                            ].push(schedBlockToPush);

                            // console.log(sortedRoomSchedule[lastSchedBlock.room.room_id][SCHOOL_DAYS[i]])

                            // remove from prev room
                            loop4: for (
                                let m = 0;
                                m <
                                sortedRoomSchedule[specSched.room.room_id][
                                    SCHOOL_DAYS[i]
                                ].length;
                                m++
                            ) {
                                let specDaySched =
                                    sortedRoomSchedule[specSched.room.room_id][
                                        SCHOOL_DAYS[i]
                                    ];

                                if (
                                    specDaySched[m].timeBlock.start ===
                                        specSched.timeBlock.start &&
                                    specDaySched[m].timeBlock.end ===
                                        specSched.timeBlock.end
                                ) {
                                    sortedRoomSchedule[specSched.room.room_id][
                                        SCHOOL_DAYS[i]
                                    ].splice(m, 1);
                                    break loop4;
                                }
                            }

                            // console.log(sortedRoomSchedule[specSched.room.room_id][SCHOOL_DAYS[i]])
                            // return;

                            continue loop3;
                        }
                    }
                }
            }
        }

        tries++;
        // run ung first for looop
        ({
            roomsWithSlots,
            roomsOverBooked,
            roomsWithSlotsScheds,
            roomsOverBookedScheds
        } = getOverBookedAndWithSlotsRooms({
            roomKeys,
            sortedRoomSchedule,
            roomsOverBooked,
            roomsOverBookedScheds,
            roomsWithSlots,
            roomsWithSlotsScheds
        }));

        // console.log('rooms overbooked after loop');
        // console.log(roomsOverBooked);
        // console.log(sortedRoomSchedule[roomsOverBooked['M'][0]]['M'])
    }

    // check diot
    // console.log('rooms overbooked');
    // console.log(roomsOverBooked);
    // console.log(sortedRoomSchedule[roomsOverBooked['M'][0]]['M'])
    // console.log(roomsWithSlots);

    // convert back to normal chromosome
    let repairedChromosome = roomToClassSchedule({
        roomSchedule: sortedRoomSchedule,
        chromosome: val.chromosome
    });

    return repairedChromosome;
};

const getOverBookedAndWithSlotsRooms = ({
    roomKeys,
    sortedRoomSchedule
}: {
    roomKeys: any;
    sortedRoomSchedule: any;
    roomsWithSlots: any;
    roomsWithSlotsScheds: any;
    roomsOverBooked: any;
    roomsOverBookedScheds: any;
}) => {
    let roomsOverBooked: any = {
        M: [],
        T: [],
        W: [],
        TH: [],
        F: [],
        S: []
    };

    let roomsWithSlots: any = {
        M: [],
        T: [],
        W: [],
        TH: [],
        F: [],
        S: []
    };

    let roomsWithSlotsScheds: any = {
        M: {},
        T: {},
        W: {},
        TH: {},
        F: {},
        S: {}
    };

    let roomsOverBookedScheds: any = {
        M: {},
        T: {},
        W: {},
        TH: {},
        F: {},
        S: {}
    };

    for (let i = 0; i < roomKeys.length; i++) {
        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let daySched = sortedRoomSchedule[roomKeys[i]][SCHOOL_DAYS[j]];

            let ascendingSched = daySched.sort(
                (schedBlock1: any, schedBlock2: any) => {
                    return (
                        parseInt(schedBlock1.timeBlock.start, 10) -
                        parseInt(schedBlock2.timeBlock.start, 10)
                    );
                }
            );

            if (ascendingSched.length < 1) {
                continue;
            }

            let lastSchedBlock = ascendingSched[ascendingSched.length - 1];
            if (parseInt(lastSchedBlock.timeBlock.end) < 2100) {
                roomsWithSlots[SCHOOL_DAYS[j]].push(roomKeys[i]);
                roomsWithSlotsScheds[SCHOOL_DAYS[j]][roomKeys[i]] =
                    ascendingSched;
                continue;
            }

            roomsOverBooked[SCHOOL_DAYS[j]].push(roomKeys[i]);
            for (let k = 0; k < ascendingSched.length; k++) {
                if (parseInt(ascendingSched[k].timeBlock.end) > 2100) {
                    if (!roomsOverBookedScheds[SCHOOL_DAYS[j]][roomKeys[i]]) {
                        roomsOverBookedScheds[SCHOOL_DAYS[j]][roomKeys[i]] = [];
                    }
                    roomsOverBookedScheds[SCHOOL_DAYS[j]][roomKeys[i]].push(
                        ascendingSched[k]
                    );
                }
            }
        }
    }

    return {
        roomsOverBooked,
        roomsOverBookedScheds,
        roomsWithSlots,
        roomsWithSlotsScheds
    };
};

const roomToClassSchedule = ({
    roomSchedule,
    chromosome
}: {
    roomSchedule: any;
    chromosome: any;
}) => {
    let schedByClass: any = [];

    // loop thru the schedule
    // extract from the schedblock ung section
    // extract from the section ung keys
    // check if may ganon tapos pag wala create

    let roomKeys = Object.keys(roomSchedule);
    for (let i = 0; i < roomKeys.length; i++) {
        let specRoomSchedule = roomSchedule[roomKeys[i]];

        for (let j = 0; j < SCHOOL_DAYS.length; j++) {
            let daySched = specRoomSchedule[SCHOOL_DAYS[j]];

            for (let k = 0; k < daySched.length; k++) {
                let schedBlock = daySched[k];
                let section = schedBlock.section;

                let department = section.split('_')[0];
                let year = section.split('_')[1][0];
                let sectionLetter = section.slice(-1);

                let departmentAndYearKey =
                    department +
                    '_' +
                    year +
                    (year == 1
                        ? 'st'
                        : year == 2
                          ? 'nd'
                          : year == 3
                            ? 'rd'
                            : 'th');
                let sectionKey = department + '_' + year + sectionLetter;

                let departmentIndex = -1;
                if (
                    !keyAlreadyInClassSchedule({
                        classSchedule: schedByClass,
                        type: 'department',
                        key: departmentAndYearKey
                    })
                ) {
                    let departmentBlock = {
                        [departmentAndYearKey]: []
                    };
                    schedByClass.push(departmentBlock);
                    departmentIndex = schedByClass.length - 1;
                } else {
                    // get index of that specific key
                    departmentIndex = getIndexFromKey({
                        arr: schedByClass,
                        key: departmentAndYearKey
                    });
                }

                let sectionIndex = -1;
                if (
                    !keyAlreadyInClassSchedule({
                        classSchedule: schedByClass,
                        type: 'section',
                        key: sectionKey
                    })
                ) {
                    let sectionBlock = {
                        [sectionKey]: {
                            M: [],
                            T: [],
                            W: [],
                            TH: [],
                            F: [],
                            S: []
                        }
                    };
                    schedByClass[departmentIndex][departmentAndYearKey].push(
                        sectionBlock
                    );
                    sectionIndex =
                        schedByClass[departmentIndex][departmentAndYearKey]
                            .length - 1;
                } else {
                    // get index of that specific key
                    sectionIndex = getIndexFromKey({
                        arr: schedByClass[departmentIndex][
                            departmentAndYearKey
                        ],
                        key: sectionKey
                    });
                }

                // ppush
                const { section: excludeSectionKey, ...schedBlockToPush } =
                    schedBlock;
                schedByClass[departmentIndex][departmentAndYearKey][
                    sectionIndex
                ][sectionKey][SCHOOL_DAYS[j]].push(schedBlockToPush);
            }
        }
    }

    return schedByClass;
};

const getIndexFromKey = ({ arr, key }: { arr: any[]; key: string }) => {
    for (let i = 0; i < arr.length; i++) {
        if (Object.keys(arr[i])[0] === key) {
            return i;
        }
    }

    return -1;
};

const keyAlreadyInClassSchedule = ({
    classSchedule,
    type,
    key
}: {
    classSchedule: any;
    type: string;
    key: string;
}) => {
    let deptAndYearKeys = [];
    let sectionKeys = [];

    for (let i = 0; i < classSchedule.length; i++) {
        deptAndYearKeys.push(Object.keys(classSchedule[i])[0]);
    }

    for (let i = 0; i < classSchedule.length; i++) {
        let deptAndYearKey = Object.keys(classSchedule[i])[0];
        let deptAndYearSchedule = classSchedule[i][deptAndYearKey];

        for (let j = 0; j < deptAndYearSchedule.length; j++) {
            sectionKeys.push(Object.keys(deptAndYearSchedule[j])[0]);
        }
    }

    if (type === 'section') {
        return sectionKeys.includes(key);
    }

    return deptAndYearKeys.includes(key);
};

const resolveConflict = ({
    schedBlock1,
    schedBlock2
}: {
    schedBlock1: any;
    schedBlock2: any;
}) => {
    // check if may conflict
    if (
        // parseInt(schedBlock2.timeBlock.start) >= parseInt(schedBlock1.timeBlock.start) &&
        parseInt(schedBlock2.timeBlock.start) <=
        parseInt(schedBlock1.timeBlock.end)
    ) {
        // console.log('RESOLVING CONFLICT');

        schedBlock2.timeBlock.start = schedBlock1.timeBlock.end;

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
                    if (
                        !newChromosome1[i]?.[yearAndDepartmentKey]?.[
                            sectionIndex
                        ]?.[specSectionKey]?.[newDay]
                    ) {
                        newChromosome1[i][yearAndDepartmentKey][sectionIndex][
                            specSectionKey
                        ] = {
                            M: [],
                            T: [],
                            W: [],
                            TH: [],
                            F: [],
                            S: []
                        };
                    }
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

                    // sort the schedule by section letter
                    let sortedKeys: any = [];
                    for (
                        let m = 0;
                        m < parent2Copy[i][yearAndDepartmentKey].length;
                        m++
                    ) {
                        sortedKeys.push(
                            Object.keys(
                                parent2Copy[i][yearAndDepartmentKey][m]
                            )[0]
                        );
                    }
                    sortedKeys = sortedKeys.sort();

                    let sortedScheds = [];
                    for (let m = 0; m < sortedKeys.length; m++) {
                        for (
                            let n = 0;
                            n < parent2Copy[i][yearAndDepartmentKey].length;
                            n++
                        ) {
                            if (
                                Object.keys(
                                    parent2Copy[i][yearAndDepartmentKey][n]
                                )[0] === sortedKeys[m]
                            ) {
                                sortedScheds.push(
                                    parent2Copy[i][yearAndDepartmentKey][n]
                                );
                            }
                        }
                    }

                    parent2Copy[i][yearAndDepartmentKey] = sortedScheds;

                    if (schedBlock.course.subject_code === courseCode) {
                        // let schedBlockInNewChromosome2 =
                        //     newChromosome2[i][yearAndDepartmentKey][j][
                        //         specSectionKey
                        //     ][SCHOOL_DAYS[k]][l];

                        // add ung new timeblock from chromosome1 to chromosome2
                        if (
                            !newChromosome2[i]?.[yearAndDepartmentKey]?.[
                                sectionIndex
                            ]?.[specSectionKey]?.[newDay]
                        ) {
                            // Handle the case where newDay is undefined
                            newChromosome2[i][yearAndDepartmentKey][
                                sectionIndex
                            ][specSectionKey] = {
                                M: [],
                                T: [],
                                W: [],
                                TH: [],
                                F: [],
                                S: []
                            };
                        }
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

                        // console.log(parent2Copy[i][yearAndDepartmentKey]);
                        // console.log(sectionIndex);
                        // console.log(specSectionKey);
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
