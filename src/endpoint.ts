import express from 'express';
import { runAlgo, runAlgoNoCrossOver, runScript } from './v1/script';
import { generateChromosome } from './v1/generate';
import { evaluate, evaluateFast } from './v2/evaluate';
import { chromosome } from './data';
import { generateChromosomeV2 } from './v2/generateV2';
import { runGAV2 } from './v2/scriptV2';
import { runGAV3 } from './v3/scriptV3';
import { applyClassViolationsToSchedule, applyTASViolationsToSchedule, getScheduleFromCache, insertToScheduleCache } from './utils';

const app = express();
const port = 3000;

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
    let ret = await runGAV2({semester: 2});
    // console.log(violations)
    // console.log(score)
    res.json(ret);
});

app.get('/test-ga-v3', async (req, res) => {
    let schedules = await runGAV3()
    res.json(schedules)
})

// apply tas violations
app.get('/generate-schedule', async (req, res) => {
    let scheduleWithViolations
    let TASScheduleWithViolations

    // check cache table if may laman
    let topSchedule = await getScheduleFromCache();

    // // if meron 
    if (topSchedule){
        // select that tapos apply violations
        scheduleWithViolations = applyClassViolationsToSchedule(topSchedule.classSchedule, topSchedule.violations)
        TASScheduleWithViolations = applyTASViolationsToSchedule(topSchedule.TASSchedule, topSchedule.violations)

        res.json({scheduleWithViolations, violations: topSchedule.violations});
    }  

    // if wala then    
    // run ga
    let generatedSchedules: any = await runGAV3()
    
    for (let i = 1; i < generatedSchedules.length; i++){
        // store all the ones with 0 0 in cache table
        let chromosome = generatedSchedules[i];
        await insertToScheduleCache(chromosome);
    }
    
    // except the one na irereturn
    let topGeneratedSchedule: any = generatedSchedules[0]

    scheduleWithViolations = applyClassViolationsToSchedule(topGeneratedSchedule.classSchedule, topGeneratedSchedule.violations)
    TASScheduleWithViolations = applyTASViolationsToSchedule(topSchedule.TASSchedule, topGeneratedSchedule.violations)
    res.json({scheduleWithViolations, violations: topGeneratedSchedule.violations});
    // res.json(topGeneratedSchedule)

})

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
