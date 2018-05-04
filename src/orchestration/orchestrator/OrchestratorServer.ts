import {Orchestrator} from "./Orchestrator";
import * as http from "http";
import * as express from 'express';
import * as bodyparser from 'body-parser';
import * as uuid from "uuid";
import {RemoteWorker} from "../worker/RemoteWorker";

export class OrchestratorServer {

    private app = express();
    private bodyParser = bodyparser;
    private router = express.Router();
    private server = http.createServer(this.app);

    constructor(private readonly _orch: Orchestrator) {
        this.app.use(this.bodyParser.urlencoded({extended: true}));
        this.app.use(this.bodyParser.json());


        this.app.use('/orchestrator', this.router);

        this.router.post('/register', (req, res) => {
            const jobs: string[] = req.body.jobs;
            if (jobs) {
                let address = req.ip;
                if (req.body.address) {
                    address = req.body.address;
                }
                address = req.body.port ? address + ":" + req.body.port : address;
                const remoteWorker: RemoteWorker = new RemoteWorker(uuid.v4(), address, jobs);
                this._orch.register(remoteWorker.id, remoteWorker);
                res.json({message: 'success', id: remoteWorker.id});
            }
        });

        this.router.post('/job/complete', (req, res) => {
            console.log('Completed Job:', req.body);
            const jobId = req.body.jobId || false;
            const worker = req.body.worker || false;
            const result: any = req.body.result;
            if (jobId && worker) {
                this._orch.complete(worker, jobId, result);
                res.json({message: 'success', id: jobId})
            } else {
                res.json({message: 'missing one or more values', id: jobId, worker: worker})
            }
        });

        this.router.get('/test', (req, res) => {
            this._orch.schedule('test');
            res.json({message: 'ok'})
        });

        this.router.get('/job/', (req, res) => {
            return res.json(this._orch.all);
        });

        this.router.get('/job/done', (req, res) => {
            return res.json(this._orch.completed);
        });

        this.router.get('/job/pending', (req, res) => {
            return res.json(this._orch.pending);
        });

        this.router.get('/job/:job_id', (req, res) => {
            return res.json(this._orch.status(req.params.job_id))
        });

        this.router.get('/job/:job_id/result', (req, res) => {
            let data = this._orch.fetch(req.params.job_id);
            data ? res.json({message: 'ok', data: data}) : res.json({message: 'none', data: data})
        });

        this.server.listen(process.env.PORT || 8999, () => {
            console.log(`Orchestrator started on port ${this.server.address().port}`);
        });
    }
}