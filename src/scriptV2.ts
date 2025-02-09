import { evaluate } from "./evaluate";
import { generateChromosomeV2 } from "./generateV2";

export const runGAV2 = async () => {
    let population: { chromosome: any; score: number; violations: [{violationType: string, violationCount: number}] }[] = [];
    
    console.log('Generating initial population...');
    for (let i = 0; i < 500; i++) {
        // console.log('generating chromosome')
        const chromosome = await generateChromosomeV2();
        // console.log('generated chromosome')
        // console.log('evaluating chromosome')
        // gawing isang loop ung eval para bumilis
        const {score, violationType} = await evaluate(chromosome);
        // console.log('evaluated chromosome')
        population.push({ chromosome, score, violations: violationType });
        // console.log(`Chromosome ${i} generated with score ${score}`);
    }

    const findTop50 = (array: { chromosome: any; score: number, violations: [{violationType: string, violationCount: number}] }[]) => {
        return array
            .sort((a, b) => b.score - a.score) // Sort by score in descending order
            .slice(0, 50); // Get the top 50
    };

    const top50 = findTop50(population);


    return {schedule: top50[0].chromosome, score: top50[0].score, violations: top50[0].violations};
}