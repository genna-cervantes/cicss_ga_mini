import express from 'express';
import { runAlgo, runAlgoNoCrossOver, runScript } from './v1/script';
import { generateChromosome } from './v1/generate';
import { evaluate, evaluateFast } from './v2/evaluate';
import { chromosome } from './data';
import { generateChromosomeV2 } from './v2/generateV2';
import { runGAV2 } from './v2/scriptV2';
import {
    getAvailableProfsSpecificDay,
    getBetterCourses,
    runGAV3
} from './v3/scriptV3';
import {
    applyClassViolationsToSchedule,
    applyRoomIdsToTASSchedule,
    applyTASViolationsToSchedule,
    applyViolationsToRoomSchedule,
    checkLockedDepartments,
    checkLockedDepartmentsCache,
    clearScheduleCache,
    compareViolations,
    editSchedBlockClassSchedule,
    extractRoomScheduleFromClassSchedule,
    extractTASScheduleFromClassSchedule,
    flattenViolations,
    getActiveClassSchedule,
    getActiveRoomSchedule,
    getActiveTASSchedule,
    getActiveViolations,
    getClassScheduleBySection,
    getCSSchedule,
    getISSchedule,
    getITSchedule,
    getReadyDepartments,
    getRoomScheduleByRoomId,
    getRoomScheduleFromDepartmentLockedSchedule,
    getScheduleFromCache,
    getTASScheduleByTASId,
    getTASScheduleFromDepartmentLockedSchedule,
    insertToSchedule,
    insertToScheduleCache,
    lockScheduleByDepartment,
    minimizeClassSchedule,
    readyScheduleByDepartment,
    tranformSections,
    unlockScheduleByDepartment
} from './utils';
import cors from 'cors';
import e from 'express';
import { evaluateRoomSchedule, evaluateTASSchedule, evaluateV3 } from './v3/evaluatev3';

const app = express();
const port = 3000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ auth: true });
});

app.get('/health', (req, res) => {
    res.send('goods');
});

// with cross over
app.get('/schedule', async (req, res) => {
    console.log('endpoint hit');
    // let schedule = await runScript();
    let { schedule, score, violations } = await runAlgo();
    console.log(violations);
    console.log(score);
    res.json(schedule); // Send the schedule data as JSON response
});

// test generation
app.get('/test', async (req, res) => {
    console.log('test endpoint hit');
    let csChromosome = await generateChromosome();
    res.json(csChromosome);
});

// to time generation time
app.get('/time-sched', async (req, res) => {
    console.log('testing generation time');
    for (let i = 0; i < 500; i++) {
        const chromosome = await generateChromosome();
    }
    res.json('done');
});

// to time original evaluation time
app.get('/time-eval', async (req, res) => {
    console.log('testing evaluation time');
    for (let i = 0; i < 500; i++) {
        const score = await evaluate(chromosome);
    }
    res.json('done');
});

// time new evaluation
app.get('/evaluate-fast', async (req, res) => {
    let violationTracker = await evaluateFast({ chromosome, semester: 2 });
    res.json(violationTracker);
});

// no cross over
app.get('/schedule-no-crossover', async (req, res) => {
    let { schedule, score, violations } = await runAlgoNoCrossOver();
    console.log(violations);
    console.log(score);
    res.json(schedule);
});

// app.get('/fitness', async (req, res) => {
//     let {violations, violationCount, score} = await evaluate();
//     res.json({violations, violationCount, score})
// })

app.get('/test-ga-v2', async (req, res) => {
    // await generateChromosomeV2();
    // let {schedule, score, violations} = await runGAV2()
    // let { ogtop50ids, newtop50ids } = await runGAV2({semester: 2});
    let ret = await runGAV2({ semester: 2 });
    // console.log(violations)
    // console.log(score)
    res.json(ret);
});

// app.get('/test-ga-v3', async (req, res) => {
//     let schedules = await runGAV3();
//     res.json(schedules);
// });
app.get('/schedule/lock/:department', async (req, res) => {
    const department = req.params.department;

    let locked = await lockScheduleByDepartment(department);

    console.log('lock hit');
    console.log(department);

    if (locked) {
        res.json({
            success: true
        });
        return;
    }

    res.json({
        success: false,
        error: 'Cannot lock schedule'
    });
});

app.get('/schedule/ready/departments', async (req, res) => {
    const readyDepartments = await getReadyDepartments();
    console.log(readyDepartments);
    res.json(readyDepartments);
});

app.get('/schedule/ready/:department', async (req, res) => {
    const department = req.params.department;

    let readied = await readyScheduleByDepartment(department);

    console.log('ready hit');
    console.log(department);

    if (readied) {
        res.json({
            success: true
        });
        return;
    }

    res.json({
        success: false,
        error: 'Cannot ready schedule'
    });
});

app.get('/schedule/unlock/:department', async (req, res) => {
    const department = req.params.department;

    let unlocked = await unlockScheduleByDepartment(department);

    // check din dito if locked na lahat para go na to manual editing

    if (unlocked) {
        res.json({
            success: true
        });
        return;
    }

    res.json({
        success: false,
        error: 'Cannot unlock schedule'
    });
});

app.post('/schedule/check/violations', async (req, res) => {
    // req obj
    // const { course, day, id, room, tas, timeBlock, violations } = req.body;

    // class violations check
    // fetch entire schedule
    let classSchedule = await getActiveClassSchedule()
    let newClassSchedule = await editSchedBlockClassSchedule(classSchedule, req.body)

    // evaluate the schedule
    // res.json(newClassSchedule)

    // convert to tas schedule
    let newTASSchedule = extractTASScheduleFromClassSchedule(newClassSchedule)
    // res.json(newTASSchedule) // PFLE11LEk7
    const {violations: TASViolations, violationCount: TASViolationCount} = evaluateTASSchedule(newTASSchedule)
    if (TASViolationCount > 0){
        // evaluate conflicts - return na agad if meron
        res.json(TASViolations)
        return;
    }
    
    // convert to room schedule
    let newRoomSchedule = extractRoomScheduleFromClassSchedule(newClassSchedule)
    // res.json(newRoomSchedule);
    const {violations: roomViolations, violationCount: roomViolationCount} = evaluateRoomSchedule(newRoomSchedule)
    console.log('roomviol', roomViolations)
    if (roomViolationCount > 0){
        // evaluate conflicts - return na agad if meron
        res.json(roomViolations)
        return;
    }

    // evaluate conflicts
    // im creating new ids here
    let {allViolations} = await evaluateV3({schedule: newClassSchedule, TASSchedule: newTASSchedule, roomSchedule: newRoomSchedule, semester: 2})
    let currentViolations = await getActiveViolations()

    let flattenedViolations = flattenViolations(allViolations);
    // let newViolations = filterNewViolations(structuredClassViolations, req.body)

    let notInOriginalViolations = [];
    if (flattenedViolations.length !== currentViolations.length){
        notInOriginalViolations = flattenedViolations.filter(viol1 => !currentViolations.some((viol2:any) => compareViolations(viol1, viol2)))
    }

    if (notInOriginalViolations.length > 0){
        res.json(notInOriginalViolations)
        return;
    }

    res.json({
        success: true
    })


    // cross check with violations

    // if may added - return added violations
});

app.get('/schedule/class/:department/:year/:section', async (req, res) => {
    const section = req.params.section;
    const year = req.params.year;
    const department = req.params.department;

    const { schedule, classViolations, TASViolations } =
        await getClassScheduleBySection(year, section, department);
    if (schedule == null) {
        res.json({ error: true, message: 'call the generate function again' });
        return;
    }

    let scheduleWithViolations = applyClassViolationsToSchedule(
        department,
        year,
        section,
        schedule,
        classViolations ?? {},
        TASViolations ?? {}
    );

    res.json(scheduleWithViolations);
});

app.get('/schedule/tas/:tasId', async (req, res) => {
    const tasId = req.params.tasId;

    const { TASSchedule, classSchedule, classViolations, TASViolations } =
        await getTASScheduleByTASId(tasId);
    if (TASSchedule == null || classSchedule == null) {
        res.json({ error: true, message: 'call the generate function again' });
        return;
    }

    // console.log(TASSchedule)

    let scheduleWithRoomIds = applyRoomIdsToTASSchedule(
        TASSchedule,
        classSchedule
    );

    let scheduleWithViolations = applyTASViolationsToSchedule(
        tasId,
        scheduleWithRoomIds,
        classViolations ?? [],
        TASViolations ?? []
    );

    res.json(scheduleWithViolations);
});

app.get('/schedule/room/:roomId', async (req, res) => {
    const roomId = req.params.roomId;

    const { roomSchedule, classViolations, TASViolations } =
        await getRoomScheduleByRoomId(roomId);
    if (roomSchedule == null) {
        res.json({ error: true, message: 'call the generate function again' });
        return;
    }

    let scheduleWithViolations = applyViolationsToRoomSchedule(
        roomId,
        roomSchedule,
        classViolations,
        TASViolations
    );

    res.json(scheduleWithViolations);
});

app.post('/generate-schedule', async (req, res) => {
    console.log('getting called');

    let { csLocked, itLocked, isLocked } = await checkLockedDepartments();
    let { csLockedCache, itLockedCache, isLockedCache } =
        await checkLockedDepartmentsCache();

    if (
        csLocked === csLockedCache &&
        itLocked === itLockedCache &&
        isLocked === isLockedCache
    ) {
        let topSchedule = await getScheduleFromCache();

        // // if meron
        if (topSchedule) {
            console.log('top schedule');
            // select that tapos apply violations
            // scheduleWithViolations = applyClassViolationsToSchedule(topSchedule.class_schedule, topSchedule.violations)
            // TASScheduleWithViolations = applyTASViolationsToSchedule(topSchedule.tas_schedule, topSchedule.violations)

            // insert that to schedules array tapos tanggalin ung previous na andon
            await insertToSchedule({
                classSchedule: topSchedule.class_schedule,
                TASSchedule: topSchedule.tas_schedule,
                roomSchedule: topSchedule.room_schedule,
                classViolations: topSchedule.class_violations,
                tasViolations: topSchedule.tas_violations,
                csLocked: topSchedule.cs_locked,
                itLocked: topSchedule.it_locked,
                isLocked: topSchedule.is_locked
            });

            // res.json({scheduleWithViolations, violations: topSchedule.violations});
            // const schedule = await getClassScheduleBySection('1', 'CSA', 'CS');
            // res.json(schedule)
            res.json(true);
            return;
        }
    } else {
        clearScheduleCache();
    }

    // iba may nag lock so malamang generate ulit ng bago

    // console.log(req.body)
    let csSchedule = {};
    let itSchedule = {};
    let isSchedule = {};
    let lockedDepartments = [];

    if (csLocked) {
        console.log('cs locked');
        csSchedule = await getCSSchedule();
        lockedDepartments.push('CS');
    }
    if (isLocked) {
        console.log('is locked');
        isSchedule = await getISSchedule();
        lockedDepartments.push('IS');
    }
    if (itLocked) {
        console.log('it locked');
        itSchedule = await getITSchedule();
        lockedDepartments.push('IT');
    }

    let activeTASSchedule = await getActiveTASSchedule();
    let activeRoomSchedule = await getActiveRoomSchedule();

    let TASScheduleLocked = getTASScheduleFromDepartmentLockedSchedule({
        departments: lockedDepartments,
        TASSchedule: activeTASSchedule
    });
    let roomScheduleLocked = getRoomScheduleFromDepartmentLockedSchedule({
        departments: lockedDepartments,
        roomSchedule: activeRoomSchedule
    });

    let { CSSections, ITSections, ISSections, semester } = req.body;

    let transformedCSFirstYearSections = tranformSections(CSSections[1]);
    let transformedCSSecondYearSections = tranformSections(CSSections[2]);
    let transformedCSThirdYearSections = tranformSections(CSSections[3]);
    let transformedCSFourthYearSections = tranformSections(CSSections[4]);

    let transformedITFirstYearSections = tranformSections(ITSections[1]);
    let transformedITSecondYearSections = tranformSections(ITSections[2]);
    let transformedITThirdYearSections = tranformSections(ITSections[3]);
    let transformedITFourthYearSections = tranformSections(ITSections[4]);

    let transformedISFirstYearSections = tranformSections(ISSections[1]);
    let transformedISSecondYearSections = tranformSections(ISSections[2]);
    let transformedISThirdYearSections = tranformSections(ISSections[3]);
    let transformedISFourthYearSections = tranformSections(ISSections[4]);

    console.log('schedules');
    console.log(csSchedule);
    console.log(itSchedule);
    console.log(isSchedule);

    let generatedSchedules: any = await runGAV3({
        csLocked,
        itLocked,
        isLocked,
        csSchedule,
        itSchedule,
        isSchedule,
        TASScheduleLocked,
        roomScheduleLocked,
        CSFirstYearSections: transformedCSFirstYearSections,
        CSSecondYearSections: transformedCSSecondYearSections,
        CSThirdYearSections: transformedCSThirdYearSections,
        CSFourthYearSections: transformedCSFourthYearSections,
        ITFirstYearSections: transformedITFirstYearSections,
        ITSecondYearSections: transformedITSecondYearSections,
        ITThirdYearSections: transformedITThirdYearSections,
        ITFourthYearSections: transformedITFourthYearSections,
        ISFirstYearSections: transformedISFirstYearSections,
        ISSecondYearSections: transformedISSecondYearSections,
        ISThirdYearSections: transformedISThirdYearSections,
        ISFourthYearSections: transformedISFourthYearSections,
        semester
    });

    // res.json(generatedSchedules)
    // return;

    // console.log(generatedSchedules)
    // return;

    if (generatedSchedules?.error) {
        res.json(generatedSchedules.error);
        return;
    }

    for (let i = 1; i < generatedSchedules?.length; i++) {
        let chromosome = generatedSchedules[i];

        console.log(chromosome.classSchedule);

        await insertToScheduleCache(chromosome);
    }

    let topGeneratedSchedule: any = generatedSchedules[0];

    console.log(topGeneratedSchedule.classSchedule);

    let miniClassSchedule = minimizeClassSchedule(
        topGeneratedSchedule.classSchedule
    );

    await insertToSchedule({
        classSchedule: miniClassSchedule,
        TASSchedule: topGeneratedSchedule.TASSchedule,
        roomSchedule: topGeneratedSchedule.roomSchedule,
        classViolations: topGeneratedSchedule.structuredClassViolations,
        tasViolations: topGeneratedSchedule.structuredTASViolations,
        csLocked,
        itLocked,
        isLocked
    });

    // res.json(true);
    res.json({
        classSchedule: generatedSchedules[0].classSchedule,
        TASSchedule: generatedSchedules[0].TASSchedule
    });
    return;
});

app.get('/test-something', async (req, res) => {
    let ref = await getAvailableProfsSpecificDay('T', 'CS');
    console.log(ref);
    // res.json({ref: ref})

    getBetterCourses(ref);
});

// apply tas violations
// app.get('/generate-schedule', async (req, res) => {
//     console.log('generate endpoint hit');

//     // let scheduleWithViolations
//     // let TASScheduleWithViolations

//     // check cache table if may laman
//     let topSchedule = await getScheduleFromCache();

//     // // if meron
//     if (topSchedule) {
//         // select that tapos apply violations
//         // scheduleWithViolations = applyClassViolationsToSchedule(topSchedule.class_schedule, topSchedule.violations)
//         // TASScheduleWithViolations = applyTASViolationsToSchedule(topSchedule.tas_schedule, topSchedule.violations)

//         // insert that to schedules array tapos tanggalin ung previous na andon
//         insertToSchedule({
//             classSchedule: topSchedule.class_schedule,
//             TASSchedule: topSchedule.tas_schedule,
//             roomSchedule: topSchedule.room_schedule,
//             classViolations: topSchedule.class_violations,
//             tasViolations: topSchedule.tas_violations
//         });

//         // res.json({scheduleWithViolations, violations: topSchedule.violations});
//         // const schedule = await getClassScheduleBySection('1', 'CSA', 'CS');
//         // res.json(schedule)
//         res.json(true);
//         return;
//     }

//     // if wala then
//     // run ga
//     let generatedSchedules: any = await runGAV3();

//     console.log('structured violations');
//     // console.log(generatedSchedules[0].structuredViolations)

//     for (let i = 1; i < generatedSchedules.length; i++) {
//         // store all the ones with 0 0 in cache table
//         let chromosome = generatedSchedules[i];
//         await insertToScheduleCache(chromosome);
//         // pag hiwalayin ung violations
//     }

//     // except the one na irereturn
//     let topGeneratedSchedule: any = generatedSchedules[0];

//     // // minimize that one too
//     let miniClassSchedule = minimizeClassSchedule(
//         topGeneratedSchedule.classSchedule
//     );

//     // // scheduleWithViolations = applyClassViolationsToSchedule(miniClassSchedule, topGeneratedSchedule.violations)
//     // // TASScheduleWithViolations = applyTASViolationsToSchedule(topGeneratedSchedule.TASSchedule, topGeneratedSchedule.violations)

//     // // console.log(topGeneratedSchedule.violations)
//     // // console.log(topGeneratedSchedule)
//     // // insert that to schedules array tapos tanggalin ung previous na andon
//     // // pag hiwalayin ung violations
//     insertToSchedule({
//         classSchedule: miniClassSchedule,
//         TASSchedule: topGeneratedSchedule.TASSchedule,
//         roomSchedule: topGeneratedSchedule.roomSchedule,
//         classViolations: topGeneratedSchedule.structuredClassViolations,
//         tasViolations: topGeneratedSchedule.structuredTASViolations
//     });

//     // return lng ung first which is for example 1CSA // bali call the other endpoinr
//     // const schedule = await getClassScheduleBySection('1', 'CSA', 'CS');
//     // res.json(schedule)
//     // res.json({scheduleWithViolations, violations: topGeneratedSchedule.violations, TASSchedule: TASScheduleWithViolations});
//     res.json(true);
//     // res.json(topGeneratedSchedule)
// });

// app.get('/test-room-real-ba', async (req, res) => {
//     let chromosome =
// })

app.get('/sametop', (req, res) => {
    let arr1 = [
        24, 10, 9, 20, 45, 83, 55, 73, 6, 50, 82, 81, 33, 34, 2, 43, 58, 97, 56,
        60, 19, 44, 17, 66, 54, 51, 28, 80, 89, 22, 48, 74, 38, 61, 5, 46, 26,
        30, 98, 15, 99, 31, 91, 4, 65, 72, 0, 14, 16, 36
    ];
    let arr2 = [
        24, 10, 9, 20, 45, 83, 55, 73, 6, 50, 82, 81, 102, 33, 34, 2, 43, 100,
        58, 97, 116, 103, 56, 60, 19, 44, 17, 66, 54, 51, 28, 80, 89, 22, 48,
        74, 38, 119, 104, 61, 5, 46, 26, 30, 98, 15, 109, 118, 99, 31
    ];

    if (arr1.length !== arr2.length) {
        res.json(false);
    }

    let sortedArr1 = [...arr1].sort((a, b) => a - b);
    let sortedArr2 = [...arr2].sort((a, b) => a - b);

    let isEqual = sortedArr1.every((val, index) => val === sortedArr2[index]);

    res.json(isEqual);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
