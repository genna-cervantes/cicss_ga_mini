import express from 'express';
import { runScript } from './script';

const app = express();
const port = 3000;

app.get('/schedule', async (req, res) => {
    console.log('endpoint hit')
    let schedule = await runScript();
    res.json(schedule); // Send the schedule data as JSON response
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
