import fs from 'node:fs';

const logFile = process.argv[2];
const sandboxDir = process.argv[3];

if (!logFile) {
    console.error("Usage: node summarize-log.mjs <logfile> [sandboxDir]");
    process.exit(1);
}

const content = fs.readFileSync(logFile, 'utf8');
const lines = content.split('\n');

console.log(`\n### Simulation Summary: ${logFile.split('/').pop()}\n`);

// Check for SIMULATION_REPORT.md
if (sandboxDir && fs.existsSync(`${sandboxDir}/SIMULATION_REPORT.md`)) {
    const report = fs.readFileSync(`${sandboxDir}/SIMULATION_REPORT.md`, 'utf8');
    console.log(`**📄 Agent Self-Report:**\n> ${report.replace(/\n/g, '\n> ')}\n`);
}

let capturingOutput = false;
let outputBuffer = [];
let lastHarnessCommand = null;
let findingReaction = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect harness command execution
    if (line.includes('exec npm run harness:') || line.includes('> harness-sandbox@1.0.0 harness:') || line.includes('> acme-core@1.0.0 harness:')) {
        const cmdMatch = line.match(/exec (npm run harness:[\w:-]+)/) || line.match(/> (?:harness-sandbox|acme-core)@1\.0\.0 (harness:[\w:-]+)/);
        if (cmdMatch) {
            if (capturingOutput) {
                analyzeAndPrint(lastHarnessCommand, outputBuffer);
            }

            const cmd = cmdMatch[1].startsWith('harness:') ? `npm run ${cmdMatch[1]}` : cmdMatch[1];
            lastHarnessCommand = cmd;
            capturingOutput = true;
            outputBuffer = [];
        }
        continue;
    }

    // Detect command completion
    if (capturingOutput && line.match(/npm run harness:[\w:-]+ (succeeded|failed|exited)/)) {
        capturingOutput = false;
        outputBuffer.push(line);
        analyzeAndPrint(lastHarnessCommand, outputBuffer);
        findingReaction = true;
        outputBuffer = [];
        continue;
    }

    // Detect end of final run
    if (capturingOutput && (line.includes('[simulation] Full log saved to:') || line.includes('[simulation] Cleaning up sandbox') || line.includes('Exit code:'))) {
        capturingOutput = false;
        analyzeAndPrint(lastHarnessCommand, outputBuffer);
        outputBuffer = [];
        continue;
    }

    if (capturingOutput) {
        outputBuffer.push(line);
    }

    if (findingReaction) {
        if (line.includes('thinking') || line.includes('codex')) {
            let reaction = [];
            for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
                if (lines[j].match(/^\[\d{4}-\d{2}-\d{2}/)) break;
                if (lines[j].trim()) reaction.push(lines[j].trim());
            }
            if (reaction.length > 0) {
                const filteredReaction = reaction.filter(l => !l.startsWith('exec ') && !l.startsWith('tokens used:'));
                if (filteredReaction.length > 0) {
                    console.log(`**🧠 Agent Reaction:**\n${filteredReaction.join('\n')}\n`);
                }
            }
            findingReaction = false;
        } else if (line.match(/^\[\d{4}-\d{2}-\d{2}/)) {
            findingReaction = false;
        }
    }
}

if (capturingOutput) {
    analyzeAndPrint(lastHarnessCommand, outputBuffer);
}

const verdictMatch = content.match(/## Verdict\s+\n+(.*)/);
if (verdictMatch) {
    console.log(`\n**🏁 Final Simulation Verdict:** ${verdictMatch[1]}`);
}

function analyzeAndPrint(command, buffer) {
    if (!command) return;

    const output = buffer.join('\n');
    let failed = true;
    if (output.includes('[HARNESS_VERDICT:PASS]')) {
        failed = false;
    }

    const result = failed ? '❌ FAILED' : '✅ PASSED';
    console.log(`\n**🤖 Agent ran:** \`${command}\``);
    console.log(`**Result:** ${result}`);

    if (failed) {
        const errorMarkers = [
            /Rule [ABC]: FAILED.*/,
            /✗ Failed:.*/,
            /Policy audit FAILED/,
            /npm ERR! .*/,
            /Error: .*/,
            /Cannot find .* '.+'/,
            /TS\d+: .*/
        ];

        let foundSpecificError = false;
        errorMarkers.forEach(regex => {
            const match = output.match(new RegExp(regex, 'g'));
            if (match) {
                console.log(`**Error:**\n> ${match.join('\n> ')}`);
                foundSpecificError = true;
            }
        });

        if (!foundSpecificError) {
            const lines = output.split('\n');
            const errLines = lines.filter(l => l.includes('fail') || l.includes('Error'));
            if (errLines.length > 0) {
                console.log(`**Error (generic):**\n> ${errLines.slice(0, 5).join('\n> ')}`);
            }
        }
    }
}
