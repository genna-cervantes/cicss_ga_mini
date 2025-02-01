import express from 'express';
import { runAlgo, runScript } from './script';
import { generateChromosome } from './generate';
import { evaluate } from './evaluate';
import { chromosome } from './data';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.json({auth: true});
})

app.get('/health', (req, res) => {
    res.send('goods');
})

app.get('/schedule', async (req, res) => {
    console.log('endpoint hit')
    // let schedule = await runScript();
    let {schedule, score, violations} = await runAlgo();
    console.log(violations)
    console.log(score)
    res.json(schedule); // Send the schedule data as JSON response
});

app.get('/test', async (req, res) => {
    console.log('test endpoint hit')
    let csChromosome = await generateChromosome();
    res.json(csChromosome)
})

app.get('/time-sched', async (req, res) => {
    console.log('testing generation time')
    for (let i = 0; i < 500; i++) {
        const chromosome = await generateChromosome();
    }
    res.json('done')
})

app.get('/time-eval', async (req, res) => {
    console.log('testing evaluation time')
    for (let i = 0; i < 500; i++){
        const score = await evaluate(chromosome);
    }
    res.json('done')
})

// app.get('/fitness', async (req, res) => {
//     let {violations, violationCount, score} = await evaluate();
//     res.json({violations, violationCount, score})
// })

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
