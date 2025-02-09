import express from 'express';
import { runAlgo, runAlgoNoCrossOver, runScript } from './script';
import { generateChromosome } from './generate';
import { evaluate, evaluateFast } from './evaluate';
import { chromosome } from './data';
import { generateChromosomeV2 } from './generateV2';

const app = express();
const port = 3001;

app.get('/', (req, res) => {
    res.json({auth: true});
})

app.get('/health', (req, res) => {
    res.send('goods');
})

// with cross over
app.get('/schedule', async (req, res) => {
    console.log('endpoint hit')
    // let schedule = await runScript();
    let {schedule, score, violations} = await runAlgo();
    console.log(violations)
    console.log(score)
    res.json(schedule); // Send the schedule data as JSON response
});

// test generation
app.get('/test', async (req, res) => {
    console.log('test endpoint hit')
    let csChromosome = await generateChromosome();
    res.json(csChromosome)
})

// to time generation time
app.get('/time-sched', async (req, res) => {
    console.log('testing generation time')
    for (let i = 0; i < 500; i++) {
        const chromosome = await generateChromosome();
    }
    res.json('done')
})

// to time original evaluation time
app.get('/time-eval', async (req, res) => {
    console.log('testing evaluation time')
    for (let i = 0; i < 500; i++){
        const score = await evaluate(chromosome);
    }
    res.json('done')
})

// time new evaluation
app.get('/evaluate-fast', async (req, res) => {
    let violationTracker = await evaluateFast({chromosome, semester: 2 })
    res.json(violationTracker)
})

// no cross over
app.get('/schedule-no-crossover', async (req, res) => {
    let {schedule, score, violations} = await runAlgoNoCrossOver();
    console.log(violations)
    console.log(score)
    res.json(schedule)
})

// app.get('/fitness', async (req, res) => {
//     let {violations, violationCount, score} = await evaluate();
//     res.json({violations, violationCount, score})
// })

app.get('/test-ga-v2', async (req, res) => {
    await generateChromosomeV2();
    res.json('done')
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
