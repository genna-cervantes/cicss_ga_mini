import { evaluate } from '../v2/evaluate';
import { evaluateFitnessScore } from './fitnessFunctions';
import { generateChromosome } from './generate';

export const runScript = async () => {
    let population: { chromosome: any; score: number }[] = [];
    
    console.log('Generating initial population...');
    for (let i = 0; i < 100; i++) {
        // console.log('generating chromosome')
        const chromosome = await generateChromosome();
        // console.log('generated chromosome')
        // console.log('evaluating chromosome')
        const score = await evaluateFitnessScore(chromosome);
        // console.log('evaluated chromosome')
        population.push({ chromosome, score });
        // console.log(`Chromosome ${i} generated with score ${score}`);
    }

    const findTop50 = (array: { chromosome: any; score: number }[]) => {
        return array
            .sort((a, b) => b.score - a.score) // Sort by score in descending order
            .slice(0, 50); // Get the top 50
    };

    for (let generation = 0; generation < 10; generation++) {
        // console.log(`Generation ${generation + 1}: Selecting top 50 chromosomes...`);
        const top50 = findTop50(population);

        // console.log(top50)

        // console.log('Performing crossover...');
        const newChromosomes = await Promise.all(
            top50.map(async (ch, index) => {
                const [parent1, parent2] = splitChromosome(ch.chromosome);
                const child = mergeChromosomes(parent1, parent2);
                // console.log(`Child ${index} created`);
                return child;
            })
        );

        // console.log('Evaluating new chromosomes...');
        const evaluatedChromosomes = await Promise.all(
            newChromosomes.map(async (ch, index) => {
                const score = await evaluateFitnessScore(ch);
                // console.log(`Chromosome ${index} evaluated with score ${score}`);
                return { chromosome: ch, score };
            })
        );

        // Update population with the new evaluated chromosomes
        population = findTop50([...population, ...evaluatedChromosomes]);
    }

    // write all top 50 population in cache
    // console.log('Algorithm completed.');
    // console.log(population)
    // // printChromosome(population[0].chromosome);
    // console.log(JSON.stringify(population[0].chromosome, null, 2));
    return population[0].chromosome;
};

export const runAlgoNoCrossOver = async () => {
    let population: { chromosome: any; score: number; violations: [{violationType: string, violationCount: number}] }[] = [];
    
    console.log('Generating initial population...');
    for (let i = 0; i < 500; i++) {
        // console.log('generating chromosome')
        const chromosome = await generateChromosome();
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

export const runAlgo = async () => {
    let population: { chromosome: any; score: number; violations: [{violationType: string, violationCount: number}] }[] = [];
    
    console.log('Generating initial population...');
    for (let i = 0; i < 500; i++) {
        // console.log('generating chromosome')
        const chromosome = await generateChromosome();
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

    // try this without ung merging to see if better ba tlga na nag ssplit and merge

    for (let generation = 0; generation < 200; generation++) {
        // console.log(`Generation ${generation + 1}: Selecting top 50 chromosomes...`);
        const top50 = findTop50(population);

        // console.log(top50)

        // { chromosome: any; score: number; violations: [{violationType: string, violationCount: number}
        // console.log('Performing crossover...');
        const newChromosomes = await Promise.all(
            top50.map(async (ch, index)=> {
                const [parent1, parent2] = splitChromosome(ch.chromosome);
                const child = mergeChromosomes(parent1, parent2);
                // console.log(`Child ${index} created`);
                return child;
            })
        );

        // console.log('Evaluating new chromosomes...');
        const evaluatedChromosomes = await Promise.all(
            newChromosomes.map(async (ch, index) => {
                const {score, violationType} = await evaluate(ch);
                // console.log(`Chromosome ${index} evaluated with score ${score}`);
                return { chromosome: ch, score, violations: violationType };
            })
        );

        // Update population with the new evaluated chromosomes
        population = findTop50([...population, ...evaluatedChromosomes]);
    }

    // write all top 50 population in cache
    // console.log('Algorithm completed.');
    // console.log(population)
    // // printChromosome(population[0].chromosome);
    // console.log(JSON.stringify(population[0].chromosome, null, 2));
    return {schedule: population[0].chromosome, score: population[0].score, violations: population[0].violations};
}

const printChromosome = (chromosome: any) => {
    for (let i = 0; i < chromosome.length; i++) {
        const value = Object.values(chromosome[i])[0];
        printYearGene(value);
    }
}

const printYearGene = (yearGene: any) => {
    for (let i = 0; i < yearGene.length; i++) {
        let gene = yearGene[i];
        let geneKeys = Object.keys(gene);
        for (let j = 0; j < geneKeys.length; j++) {
            console.log(geneKeys[j]);
            let geneKey = geneKeys[j];

            let geneKeySchedKeys = Object.keys(gene[geneKey]);
            let section = gene[geneKey];
            console.log(geneKeySchedKeys);
            for (let k = 0; k < geneKeySchedKeys.length; k++) {
                let geneKeySchedKey: any = geneKeySchedKeys[k];
                console.log(geneKeySchedKey);

                console.log(section[geneKeySchedKey]);
            }
        }
    }
};

const splitChromosome = (chromosome: any[]) => {
    // Initialize parents as arrays of objects
    const parent1: any[] = [];
    const parent2: any[] = [];

    // Iterate through each group in the chromosome
    for (const section of chromosome) {
        for (const key in section) {
            const group = section[key]; // Access the array (e.g., cs_1st: [Array])

            if (!Array.isArray(group)) {
                throw new Error(`Invalid group structure for ${key}`);
            }

            const splitPoint = Math.floor(group.length / 2); // randomize this point

            // Create split for the current group
            const groupParent1 = group.slice(0, splitPoint);
            const groupParent2 = group.slice(splitPoint);

            // Push split groups into respective parents
            parent1.push({ [key]: groupParent1 });
            parent2.push({ [key]: groupParent2 });
        }
    }

    return [parent1, parent2];
};


const mergeChromosomes = (parent1: any[], parent2: any[]) => {
    const child: any[] = [];

    // Assume parent1 and parent2 have the same structure
    for (let i = 0; i < parent1.length; i++) {
        const section1 = parent1[i];
        const section2 = parent2[i];

        for (const key in section1) {
            const groupParent1 = section1[key]; // Access parent1's group
            const groupParent2 = section2[key]; // Access parent2's group

            // Merge the groups
            child.push({ [key]: [...groupParent1, ...groupParent2] });
        }
    }

    return child;
};

// runScript();

// ung pairs pwede 12 or 1 25 ano kaya mas maganda