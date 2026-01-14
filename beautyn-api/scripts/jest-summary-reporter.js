class JestSummaryReporter {
  onRunComplete(_contexts, results) {
    const failedSuites = results.testResults.filter((suite) => suite.numFailingTests > 0);
    if (!failedSuites.length) {
      return;
    }
    const red = (text) => `\u001b[31m${text}\u001b[39m`;
    const bold = (text) => `\u001b[1m${text}\u001b[22m`;
    // Mirror Jest's "Summary of all failing tests" for quick scanning.
    console.log(`\n${bold(red('Summary of all failing tests'))}`);
    for (const suite of failedSuites) {
      const file = suite.testFilePath;
      for (const test of suite.testResults.filter((t) => t.status === 'failed')) {
        console.log((` FAIL  ${file}`));
        console.log((`  \u25cf ${test.fullName}`));
        if (test.failureMessages && test.failureMessages.length) {
          const msg = test.failureMessages[0].split('\n').slice(0, 6).join('\n');
          console.log((msg));
        }
        console.log('');
      }
    }
  }
}

module.exports = JestSummaryReporter;
