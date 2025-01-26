import express from 'express';
import { runScript } from './script';
import { generateChromosome } from './generate';

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
    let schedule = await runScript();
    res.json(schedule); // Send the schedule data as JSON response
});

app.get('/test', async (req, res) => {
    console.log('test endpoint hit')
    let csChromosome = await generateChromosome();
    res.json(csChromosome)
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
