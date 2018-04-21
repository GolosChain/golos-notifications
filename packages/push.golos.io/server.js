import path from 'path';
import minimist from 'minimist';
import scHotReboot from 'sc-hot-reboot';
import fsUtil from 'socketcluster/fsutil';
import SocketCluster from 'socketcluster';
//
const waitForFile = fsUtil.waitForFile;
const argv = minimist(process.argv.slice(2));
//
const workerControllerPath = argv.wc || process.env.SOCKETCLUSTER_WORKER_CONTROLLER;
const brokerControllerPath = argv.bc || process.env.SOCKETCLUSTER_BROKER_CONTROLLER;
const workerClusterControllerPath = argv.wcc || process.env.SOCKETCLUSTER_WORKERCLUSTER_CONTROLLER;
const environment = process.env.ENV || 'dev';
//
const options = {
  workers: Number(argv.w) || Number(process.env.SOCKETCLUSTER_WORKERS) || 1,
  brokers: Number(argv.b) || Number(process.env.SOCKETCLUSTER_BROKERS) || 1,
  port: Number(argv.p) || Number(process.env.SOCKETCLUSTER_PORT) || 8000,
  // If your system doesn't support 'uws', you can switch to 'ws' (which is slower but works on older systems).
  wsEngine: process.env.SOCKETCLUSTER_WS_ENGINE || 'sc-uws',
  appName: argv.n || process.env.SOCKETCLUSTER_APP_NAME || null,
  workerController: workerControllerPath || path.join(__dirname, 'worker.js'),
  brokerController: brokerControllerPath || path.join(__dirname, 'broker.js'),
  workerClusterController: workerClusterControllerPath || null,
  socketChannelLimit: Number(process.env.SOCKETCLUSTER_SOCKET_CHANNEL_LIMIT) || 1000,
  clusterStateServerHost: argv.cssh || process.env.SCC_STATE_SERVER_HOST || null,
  clusterStateServerPort: process.env.SCC_STATE_SERVER_PORT || null,
  clusterAuthKey: process.env.SCC_AUTH_KEY || null,
  clusterInstanceIp: process.env.SCC_INSTANCE_IP || null,
  clusterInstanceIpFamily: process.env.SCC_INSTANCE_IP_FAMILY || null,
  clusterStateServerConnectTimeout: Number(process.env.SCC_STATE_SERVER_CONNECT_TIMEOUT) || null,
  clusterStateServerAckTimeout: Number(process.env.SCC_STATE_SERVER_ACK_TIMEOUT) || null,
  clusterStateServerReconnectRandomness: Number(process.env.SCC_STATE_SERVER_RECONNECT_RANDOMNESS) || null,
  crashWorkerOnError: argv['auto-reboot'] != false,
  // If using nodemon, set this to true, and make sure that environment is 'dev'.
  killMasterOnSignal: false,
  environment
};
//
const bootTimeout = Number(process.env.SOCKETCLUSTER_CONTROLLER_BOOT_TIMEOUT) || 10000;
let SOCKETCLUSTER_OPTIONS;
//
if (process.env.SOCKETCLUSTER_OPTIONS) {
  SOCKETCLUSTER_OPTIONS = JSON.parse(process.env.SOCKETCLUSTER_OPTIONS);
}
//
for (const i in SOCKETCLUSTER_OPTIONS) {
  if (SOCKETCLUSTER_OPTIONS.hasOwnProperty(i)) {
    options[i] = SOCKETCLUSTER_OPTIONS[i];
  }
}
//
const start = function() {
  // console.log({...options});
  const socketCluster = new SocketCluster({...options, host: '0.0.0.0'});
  //
  socketCluster.on(socketCluster.EVENT_WORKER_CLUSTER_START, workerClusterInfo => {
    console.log('   >> WorkerCluster PID:', workerClusterInfo.pid);
  });
  //
  if (socketCluster.options.environment === 'dev') {
    // This will cause SC workers to reboot when code changes anywhere in the app directory.
    // The second options argument here is passed directly to chokidar.
    // See https://github.com/paulmillr/chokidar#api for details.
    console.log(`   !! The sc-hot-reboot plugin is watching for code changes in the ${__dirname} directory`);
    scHotReboot.attach(socketCluster, {
      cwd: __dirname,
      ignored: ['public', 'node_modules', 'README.md', 'Dockerfile', 'server.js', 'broker.js', /[\/\\]\./, '*.log']
    });
  }
};
//
const bootCheckInterval = Number(process.env.SOCKETCLUSTER_BOOT_CHECK_INTERVAL) || 200;
const bootStartTime = Date.now();
// Detect when Docker volumes are ready.
const startWhenFileIsReady = filePath => {
  const errorMessage = `Failed to locate a controller file at path ${filePath} ` +
  'before SOCKETCLUSTER_CONTROLLER_BOOT_TIMEOUT';

  return waitForFile(filePath, bootCheckInterval, bootStartTime, bootTimeout, errorMessage);
};
//
const filesReadyPromises = [
  startWhenFileIsReady(workerControllerPath),
  startWhenFileIsReady(brokerControllerPath),
  startWhenFileIsReady(workerClusterControllerPath)
];
//
Promise.all(filesReadyPromises)
  .then(() => {
    start();
  })
  .catch(err => {
    console.error(err.stack);
    process.exit(1);
  });
