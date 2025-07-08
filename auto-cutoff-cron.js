#!/usr/bin/env node

// Auto Cut-off Cron Job
// Script untuk menjalankan auto cut-off secara berkala

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function runAutoCutoffJob() {
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Running auto cut-off job...`);
    
    const response = await fetch(`${API_BASE_URL}/api/attendance/auto-cutoff-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Auto cut-off job completed successfully`);
      console.log(`📊 Total employees checked: ${result.totalEmployeesChecked}`);
      console.log(`👥 Employees processed: ${result.processedEmployees.length}`);
      
      if (result.processedEmployees.length > 0) {
        console.log(`📝 Processed employees:`);
        result.processedEmployees.forEach(emp => {
          console.log(`   - ${emp}`);
        });
      } else {
        console.log(`ℹ️  No employees needed auto cut-off at this time`);
      }
    } else {
      console.error(`❌ Auto cut-off job failed: ${result.error}`);
      if (result.details) {
        console.error(`Details: ${result.details}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error running auto cut-off job: ${error.message}`);
  }
}

async function checkJobStatus() {
  try {
    console.log(`[${new Date().toISOString()}] 📊 Checking auto cut-off job status...`);
    
    const response = await fetch(`${API_BASE_URL}/api/attendance/auto-cutoff-job`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (result.success) {
      console.log(`📈 Job Status:`);
      console.log(`   Total employees with shifts: ${result.stats.totalEmployeesWithShifts}`);
      console.log(`   Has attendance today: ${result.stats.hasAttendanceToday}`);
      console.log(`   Needs auto cut-off: ${result.stats.needsAutoCutoff}`);
      console.log(`   Already completed today: ${result.stats.alreadyCompletedToday}`);
      console.log(`   Recommendation: ${result.nextJobRecommendation}`);
    } else {
      console.error(`❌ Failed to get job status: ${result.error}`);
    }
  } catch (error) {
    console.error(`❌ Error checking job status: ${error.message}`);
  }
}

// Fungsi utama
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  console.log('🚀 Auto Cut-off Cron Job');
  console.log(`🔗 API URL: ${API_BASE_URL}`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}`);
  console.log('─'.repeat(50));

  switch (command) {
    case 'run':
      await runAutoCutoffJob();
      break;
    case 'status':
      await checkJobStatus();
      break;
    case 'both':
      await checkJobStatus();
      console.log('─'.repeat(50));
      await runAutoCutoffJob();
      break;
    default:
      console.log('Usage:');
      console.log('  node auto-cutoff-cron.js run     - Run auto cut-off job');
      console.log('  node auto-cutoff-cron.js status  - Check job status');
      console.log('  node auto-cutoff-cron.js both    - Check status then run job');
      break;
  }

  console.log('─'.repeat(50));
  console.log('✅ Cron job completed');
}

// Jalankan script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runAutoCutoffJob, checkJobStatus }; 