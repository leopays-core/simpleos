import {Injectable} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {EOSJSService} from './eosjs.service';
import {HttpClient} from '@angular/common/http';
import {BodyOutputType, Toast, ToasterService} from 'angular2-toaster';
import {LedgerHWService} from './services/ledger-h-w.service';

import * as socketIo from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class AccountsService {
  public accounts: any[];
  public mainnetActive = [];
  public selected = new BehaviorSubject<any>({});
  public selectedIdx = 0;
  public lastUpdate = new Subject<any>();
  public versionSys:string;
  usd_rate: number;
  cmcListings = [];
  tokens = [];
  actions = [];
  totalActions: number;
  sessionTokens = {};
  allowed_actions = [];
  totalAssetsSum = 0;
  loading = true;
  private readonly socket: any;

  isLedger = false;
  hasAnyLedgerAccount = false;

  actionStore = {};

  constructor(private http: HttpClient, private eos: EOSJSService, private toaster: ToasterService, private ledger: LedgerHWService) {
    this.accounts = [];
    this.usd_rate = 10.00;
    this.allowed_actions = ['transfer', 'voteproducer', 'undelegatebw', 'delegatebw'];
    // this.fetchListings();
    this.fetchEOSprice();

    this.socket = socketIo('https://api.eosrio.io/');
    this.socket.on('data', (data) => {
      console.log(data);
    });

    this.eos.online.asObservable().subscribe(value => {
      if (value) {
        const store = localStorage.getItem('actionStore.' + this.eos.chainID);
        if (store) {
          this.actionStore = JSON.parse(store);
        } else {
          this.actionStore[this.selected.getValue().name] = {
            last_gs: 0,
            actions: []
          };
        }
      }
    });

    // if(this.mainnetActive['name']==='EOS MAINNET') {
    //   this.socket.on('action', (data) => {
    //     if (!this.actionStore[data.account]) {
    //       this.actionStore[data.account] = {
    //         last_gs: 0,
    //         actions: []
    //       };
    //     }
    //
    //     this.actionStore[data.account]['last_gs'] = data.data.receipt.global_sequence;
    //     const idx = this.actionStore[data.account]['actions'].findIndex((v) => {
    //       return v.receipt.act_digest === data.data.receipt.act_digest;
    //     });
    //     if (idx === -1) {
    //       this.actionStore[data.account]['actions'].push(data.data);
    //       this.totalActions = this.actionStore[data.account]['actions'].length;
    //     }
    //   });
    // }
  }

  activeChain(chainName){
    let eos = true;
    let wbi = false;
    let jng = false;
    let tls = false;
    let CNval= chainName;

    if(localStorage.getItem('simplEOS.storeChain') && chainName === 'START'){
      let ssC = JSON.parse(localStorage.getItem('simplEOS.storeChain'));
      eos = ssC[0]['active'];
      wbi = ssC[1]['active'];
      tls = ssC[2]['active'];
      jng = ssC[3]['active'];
    }else{
      switch (chainName) {
        case 'EOS MAINNET':{ eos=true; wbi=false; jng=false; tls=false; break; }
        case 'WORBLI MAINNET':{ wbi=true; eos=false; jng=false; tls=false; break; }
        case 'JUNGLE TESTNET':{ jng=true; eos=false; wbi= false; tls=false; break; }
        case 'TELOS TESTNET':{ tls=true; eos=false; wbi=false; jng=false;  break; }
        default:{ eos=true; wbi=false; jng=false; tls=false; break; }
      }
    }


    const mainNet  =  [{
      id:'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
      symbol: 'EOS',
      name:'EOS MAINNET',
      active:eos,
      firstApi:'https://api.eosrio.io',
      history:true,
      send:true,
      resource:true,
      vote:true,
      dapps:true,
      addAcc:true,
      newAcc:true
    },{
      id:'73647cde120091e0a4b85bced2f3cfdb3041e266cbbe95cee59b73235a1b3b6f',
      symbol:'WBI',
      name:'WORBLI MAINNET',
      active:wbi,
      firstApi:'https://api.worbli.eosrio.io',
      history:true,
      send:true,
      resource:false,
      vote:false,
      dapps:true,
      addAcc:true,
      newAcc:false
    },{
      id:'335e60379729c982a6f04adeaad166234f7bf5bf1191252b8941783559aec33e',
      symbol:'TLOS',
      name:'TELOS TESTNET',
      active:tls,
      firstApi:'https://api.eos.miami:17441',
      history:true,
      send:true,
      resource:false,
      vote:true,
      dapps:true,
      addAcc:true,
      newAcc:true
    },{
      id:'e70aaab8997e1dfce58fbfac80cbbb8fecec7b99cf982a9444273cbc64c41473',
      symbol:'EOS',
      name:'JUNGLE TESTNET',
      active:jng,
      firstApi:'https://jungle2.cryptolions.io:443',
      history:true,
      send:true,
      resource:true,
      vote:true,
      dapps:true,
      addAcc:true,
      newAcc:true
    }];
    localStorage.setItem('simplEOS.storeChain', JSON.stringify(mainNet));
  }

  parseEOS(tk_string) {
    if (tk_string.split(' ')[1] === this.mainnetActive['symbol']) {
      return parseFloat(tk_string.split(' ')[0]);
    } else {
      return 0;
    }
  }

  extendAccount(acc) {
    let balance = 0;
    if (acc.tokens) {
      acc.tokens.forEach((tk) => {
        balance += this.parseEOS(tk);
      });
    }
    let net = 0;
    let cpu = 0;
    if (acc['self_delegated_bandwidth']) {
      net = this.parseEOS(acc['self_delegated_bandwidth']['net_weight']);
      cpu = this.parseEOS(acc['self_delegated_bandwidth']['cpu_weight']);
      balance += net;
      balance += cpu;
    }
    return {
      name: acc['account_name'],
      full_balance: Math.round((balance) * 10000) / 10000,
      staked: net + cpu,
      details: acc
    };
  }


  registerSymbol(data, contract) {
    const idx = this.tokens.findIndex((val) => {
      return val.name === data['symbol'];
    });
    let price = null;
    let usd_value = null;
    if (data['price']) {
      price = data['price'];
      usd_value = data['usd_value'];
    }
    if (idx === -1) {
      const obj = {
        name: data['symbol'],
        contract: contract,
        balance: data['balance'],
        precision: data['precision'],
        price: price,
        usd_value: usd_value
      };
      this.sessionTokens[this.selectedIdx].push(obj);
      this.tokens.push(obj);
    }
  }

  calcTotalAssets() {
    let totalSum = 0;
    this.tokens.forEach(tk => {
      if (tk.price) {
        //console.log(tk.price);
        totalSum += (tk.balance * tk.price);
      }
    });
    this.totalAssetsSum = totalSum;
  }

  fetchTokens(account) {
    this.sessionTokens[this.selectedIdx] = [];
    this.http.get('https://hapi.eosrio.io/data/tokens/' + account).subscribe((data) => {
      const contracts = Object.keys(data);
      this.loading = false;
      contracts.forEach((contract) => {
        if (data[contract]['symbol'] !== this.mainnetActive['symbol']) {
          this.registerSymbol(data[contract], contract);
        }
      });
      this.tokens.sort((a: any, b: any) => {
        return a.usd_value < b.usd_value ? 1 : -1;
      });
      this.accounts[this.selectedIdx]['tokens'] = this.tokens;
    });
  }

  getTokenBalances() {
    this.tokens.forEach((tk, index) => {
      if (this.tokens[index]) {
        this.fetchTokenPrice(tk.name).then((price) => {
          this.tokens[index]['price'] = price;
        });
      }
    });
  }


  processAction(act, id, block_num, date) {
    const contract = act['account'];
    const action_name = act['name'];
    let symbol = '', user = '', type = '', memo = '';
    let votedProducers = null, proxy = null, voter = null;
    let cpu = 0, net = 0, amount = 0;
    // console.log(act,date);
    if (action_name === 'transfer') {
      if (contract === 'eosio.token') {
        // NATIVE TOKEN
        amount = act['data']['quantity']['split'](' ')[0];
        symbol = this.mainnetActive['symbol'];
      } else {
        // CUSTOM TOKEN
        amount = act['data']['quantity']['split'](' ')[0];
        symbol = act['data']['quantity']['split'](' ')[1];
      }
      memo = act['data']['memo'];
      if (act['data']['to'] === this.selected.getValue().name) {
        user = act['data']['from'];
        type = 'received';
      } else {
        user = act['data']['to'];
        type = 'sent';
      }
    }

    if (action_name === 'buyrambytes') {
      amount = act['data']['bytes'];
      symbol = 'bytes';
      if (act['data']['receiver'] === this.selected.getValue().name) {
        user = act['data']['payer'];
        type = 'bytes_in';
      } else {
        user = act['data']['receiver'];
        type = 'bytes_out';
      }
    }


    if (action_name === 'sellram') {
      amount = act['data']['bytes'];
      symbol = 'bytes';
      user = act['data']['account'];
      type = 'bytes_s';
    }

    if (contract === 'eosio' && action_name === 'voteproducer') {
      votedProducers = act['data']['producers'];
      proxy = act['data']['proxy'];
      voter = act['data']['voter'];
      type = 'vote';
    }

    if (contract === 'eosio' && action_name === 'undelegatebw') {
      cpu = parseFloat(act['data']['unstake_cpu_quantity'].split(' ')[0]);
      net = parseFloat(act['data']['unstake_net_quantity'].split(' ')[0]);
      amount = cpu + net;
      if(act['data']['from']===act['data']['receiver']){
        user = act['data']['from'];
        type = 'unstaked_in';
      }else{
        user = act['data']['receiver'];
        type = 'unstaked_out';
      }
      // user = act['data']['from'];
      // type = 'unstaked';
    }

    if (contract === 'eosio' && action_name === 'delegatebw') {
      cpu = parseFloat(act['data']['stake_cpu_quantity'].split(' ')[0]);
      net = parseFloat(act['data']['stake_net_quantity'].split(' ')[0]);
      amount = cpu + net;
      if(act['data']['from']===act['data']['receiver']){
        user = act['data']['from'];
        type = 'staked_in';
      }else{
        user = act['data']['receiver'];
        type = 'staked_out';
      }
    }

    let valid = true;

    if (action_name === 'transfer') {
      if (act['data']['to'] === 'eosio.stake') {
        valid = false;
      }
    }

    if (act['data']['to'] === 'eosio.ram') {
      type = 'buyram';
    }
    if (act['data']['from'] === 'eosio.ram') {
      type = 'sellram';
    }

    if((contract!=='eosio' && contract!=='eosio.token' && action_name!=='transfer')){
      if(!act['data']['to'] && !act['data']['from']) {
        type = 'other';
        let dataInfo = act['data'];
        for (let dt in  dataInfo) {
          memo += dt + ': ' + dataInfo[dt] + '; ';
        }
      } else {
        type = 'other2';
        // user = act['data']['from'];
        let dataInfo = act['data'];
        for (let dt in  dataInfo) {
          memo += dt + ': ' + dataInfo[dt] + '; ';
        }
      }

    }

    if((contract==='eosio' && action_name==='newaccount')){
      type = 'new';
      user = act['data']['name'];
      memo = JSON.stringify(act['data']);
    }

    const obj = {
      id: id,
      type: type,
      action_name: action_name,
      contract: contract,
      user: user,
      block: block_num,
      date: date,
      amount: amount,
      symbol: symbol,
      memo: memo,
      votedProducers: votedProducers,
      proxy: proxy,
      voter: voter
    };
    // this.actions.unshift(obj);
    this.actions.push(obj);
  }

  getAccActions(account, reload) {

    if (account === null) {
      account = this.selected.getValue().name;
    }
    this.actions = [];
    let last_gs = -1;
    if (this.actionStore[account]) {
      last_gs = this.actionStore[account]['last_gs'];
    }

    let limited = true;
    if (!this.actionStore[account]) {
      limited = false;
    } else {
      if (!this.actionStore[account]['last_gs']) {
        limited = false;
      }
    }

    if (reload) {
      last_gs = 0;
    }

    const store = localStorage.getItem('actionStore.' + this.mainnetActive['id']);
    if (store) {
      this.actionStore = JSON.parse(store.toString());
    }

    if(!this.actionStore[this.selected.getValue().name]) {
      this.actionStore[this.selected.getValue().name] = {
        last_gs: 0,
        actions: []
      };
    }

    // if(this.mainnetActive['name']==='EOS MAINNET') {
    //   this.socket.emit('get_actions', {
    //     account: account,
    //     limited: limited,
    //     last_gs: last_gs
    //   }, (results) => {
    //     console.log('Stream output: ', results);
    //
    //     if (results === 'end') {
    //       // console.log("socket", this.actionStore[account]['actions']);
    //       this.actionStore[account]['actions'].sort((a: any, b: any) => {
    //         const dB = new Date(b.block_time).getTime();
    //         const dA = new Date(a.block_time).getTime();
    //         return dA - dB;
    //       });
    //
    //       const payload = JSON.stringify(this.actionStore);
    //       localStorage.setItem('actionStore.' + this.eos.chainID, payload);
    //
    //       this.actionStore[account]['actions'].forEach((action) => {
    //         this.processAction(action['act'], action['trx_id'], action['block_num'], action['block_time']);
    //       });
    //       // this.actionStore[account]['actions'].forEach((action) => {
    //       //   this.processAction(action['act'], action['trx_id'], action['block_num'], action['block_time']);
    //       // });
    //
    //       this.totalActions = this.actionStore[account]['actions'].length;
    //       this.accounts[this.selectedIdx]['actions'] = this.actions;
    //       this.calcTotalAssets();
    //     }
    //   });
    // } else {
    //
    // }

    this.eos.getAccountActions(account,0).then(val=>{

      const actions = val['actions'];
      // console.log(val);
      let actions2 = [];
      let ls_gs = 0;
      if(actions.length>0) {
        if (parseInt(val['actions'][0]['receipt']['global_sequence']) > parseInt(this.actionStore[account]['last_gs'])) {
          ls_gs = val['actions'][0]['receipt']['global_sequence'];
        } else {
          ls_gs = this.actionStore[account]['last_gs'];
        }

        actions.forEach(data => {
          if (data['act']['account'] === data['receipt']['receiver']) {
            // if( data['act']['data']['to'] !==  data['receipt']['receiver']){
            // console.log(data);
			actions2.push(data);
            // }
          }
        });
      }

      this.actionStore[account]['last_gs'] = ls_gs;
      this.actionStore[account]['actions'] = actions2;
      const payload = JSON.stringify(this.actionStore);
      localStorage.setItem('actionStore.' + this.mainnetActive['id'], payload);

    });

    this.actionStore[account]['actions'].forEach((action) => {
      if(action['block_time']===undefined||action['block_time']===''){
        this.processAction(action['act'], action['trx_id'], action['recv_sequence'], action['createdAt']);
      } else {
        this.processAction(action['act'], action['trx_id'], action['block_num'], action['block_time']);
      }
    });

    this.totalActions = this.actionStore[account]['actions'].length;
    this.accounts[this.selectedIdx]['actions'] = this.actions;
    this.calcTotalAssets();
  }

  reloadActions(account, reload) {
    console.log('reloading: ' + reload);
    // if (account) {
    //   this.socket.emit('close_actions_cursor', {
    //     account: account
    //   }, () => {
    //     this.socket.emit('open_actions_cursor', {
    //       account: account
    //     }, (result2) => {
    //       console.log(result2);
          this.getAccActions(account, reload);
    //     });
    //   });
    // }
  }

  select(index) {
    const sel = this.accounts[index];
    this.loading = true;
    this.tokens = [];
    if (sel['actions']) {
      if (sel.actions.length > 0) {
        this.actions = sel.actions;
      }
    } else {
      this.actions = [];
    }
    this.selectedIdx = index;
    this.selected.next(sel);

    const pbk = this.selected.getValue().details.permissions[0].required_auth.keys[0].key;
    const stored_data = JSON.parse(localStorage.getItem('eos_keys.' + this.eos.chainID));
    // if(this.isLedger){
    //   this.isLedger = stored_data[pbk]['private'] === 'ledger';
    // }

    this.socket.emit('open_actions_cursor', {
      account: this.selected.getValue().name
    }, (result) => {
      console.log(result);
    });
    this.fetchTokens(this.selected.getValue().name);
  }

  initFirst() {
    // this.selectedIdx = 0;
    // this.selected.next(this.accounts[0]);
    this.select(0);
  }

  importAccounts(accounts) {
    const chain_id = this.eos.chainID;
    const payload = {
      importedOn: new Date(),
      updatedOn: new Date(),
      accounts: accounts
    };
    localStorage.setItem('simpleos.accounts.' + chain_id, JSON.stringify(payload));
    this.loadLocalAccounts(accounts);
  }

  appendNewAccount(account) {
    const chain_id = this.eos.chainID;
    let payload = JSON.parse(localStorage.getItem('simpleos.accounts.' + chain_id));
    if (!payload) {
      payload = {
        accounts: [account],
        updatedOn: new Date()
      };
    } else {
      payload.accounts.push(account);
      payload['updatedOn'] = new Date();
    }
    localStorage.setItem('simpleos.accounts.' + chain_id, JSON.stringify(payload));
    this.loadLocalAccounts(payload.accounts);
  }

  appendAccounts(accounts) {
    const chain_id = this.eos.chainID;
    const payload = JSON.parse(localStorage.getItem('simpleos.accounts.' + chain_id));
    accounts.forEach((account) => {
      const idx = payload.accounts.findIndex((el) => {
        return el.name === account.account_name || el.account_name === account.account_name;
      });
      if (idx === -1) {
        payload.accounts.push(account);
      } else {
        const toast: Toast = {
          type: 'info',
          title: 'Import',
          body: 'The account ' + account.account_name + ' was already imported! Skipping...',
          timeout: 10000,
          showCloseButton: true,
          bodyOutputType: BodyOutputType.TrustedHtml,
        };
        this.toaster.popAsync(toast);
      }
    });
    payload.updatedOn = new Date();
    localStorage.setItem('simpleos.accounts.' + chain_id, JSON.stringify(payload));
    this.loadLocalAccounts(payload.accounts);
  }

  loadLocalAccounts(data) {
    if (data.length > 0) {
      this.accounts = [];
      data.forEach((acc_data) => {
        acc_data.tokens = [];
        if (!acc_data.details) {
          this.accounts.push(this.extendAccount(acc_data));
        } else {
          this.accounts.push(acc_data);
        }
      });
      this.refreshFromChain();
    }
  }

  refreshFromChain(): void {
    const PQ = [];
    this.accounts.forEach((account, idx) => {
      const tempPromise = new Promise((resolve, reject) => {
        this.eos.getAccountInfo(account['name']).then((newdata) => {
          this.eos.getTokens(account['name']).then((tokens) => {
            this.eos.getRefunds(account['name']).then((refunds) => {
              let ref_time = null;
              let balance = 0;
              let ref_net = 0;
              let ref_cpu = 0;
              if (refunds.rows.length > 0) {
                ref_net = this.parseEOS(refunds.rows[0]['cpu_amount']);
                ref_cpu = this.parseEOS(refunds.rows[0]['cpu_amount']);
                balance += ref_net;
                balance += ref_cpu;
                const tempDate = refunds.rows[0]['request_time'] + '.000Z';
                ref_time = new Date(tempDate);
              }
              tokens.forEach((tk) => {
                balance += this.parseEOS(tk);
              });
              let net = 0;
              let cpu = 0;
              if (newdata['self_delegated_bandwidth']) {
                net = this.parseEOS(newdata['self_delegated_bandwidth']['net_weight']);
                cpu = this.parseEOS(newdata['self_delegated_bandwidth']['cpu_weight']);
                balance += net;
                balance += cpu;
              }
              this.accounts[idx].name = account['name'];
              this.accounts[idx].full_balance = Math.round((balance) * 10000) / 10000;
              this.accounts[idx].staked = net + cpu;
              this.accounts[idx].unstaking = ref_net + ref_cpu;
              this.accounts[idx].unstakeTime = ref_time;
              this.accounts[idx].details = newdata;
              this.lastUpdate.next({
                account: account['name'],
                timestamp: new Date()
              });
              resolve();
            });
          }).catch((error2) => {
            console.log('Error on getTokens', error2);
            reject();
          });
        }).catch((error1) => {
          console.log('Error on getAccountInfo', error1);
          reject();
        });
      });
      PQ.push(tempPromise);
    });
    Promise.all(PQ).then(() => {
      this.fetchTokens(this.selected.getValue().name);
      this.eos.storeAccountData(this.accounts);
    });
  }

  fetchListings() {
    this.http.get('https://api.coinmarketcap.com/v2/listings/').subscribe((result: any) => {
      this.cmcListings = result.data;
    });
  }

  fetchTokenPrice(symbol) {
    return new Promise((resolve, reject) => {
      let id = null;
      for (let i = 0; i < this.cmcListings.length; i++) {
        if (this.cmcListings[i].symbol === symbol) {
          console.log('------->',this.cmcListings[i]);
          id = this.cmcListings[i].id;
        }
      }
      if (id && symbol === 'EOSDAC') {
        this.http.get('https://api.coinmarketcap.com/v2/ticker/' + id + '/').subscribe((result: any) => {
          resolve(parseFloat(result.data.quotes.USD['price']));
        }, (err) => {
          reject(err);
        });
      } else {
        resolve(null);
      }
    });
  }

  fetchEOSprice() {
    this.http.get('https://api.coinmarketcap.com/v2/ticker/1765/').subscribe((result: any) => {
      this.usd_rate = parseFloat(result.data.quotes.USD['price']);
    });
  }

  checkLedgerAccounts() {
    let hasLedger = false;
    const stored_data = localStorage.getItem('eos_keys.' + this.eos.chainID);
    return new Promise(resolve => {
      this.accounts.forEach((acc) => {
        const pbk = acc.details.permissions[0].required_auth.keys[0];
        // if (stored_data[pbk]['private'] === 'ledger') {
        //   hasLedger = true;
        // }
      });
      this.hasAnyLedgerAccount = hasLedger;
      resolve(hasLedger);
    });
  }

  injectLedgerSigner() {
    console.log('Ledger mode: ' + this.isLedger);
    if (this.isLedger) {
      const store = JSON.parse(localStorage.getItem('eos_keys.' + this.eos.chainID));
      const pbk = this.selected.getValue().details['permissions'][0]['required_auth'].keys[0].key;
      console.log('Publickey:', pbk);
      console.log(store);
      // if (store[pbk]['private'] === 'ledger') {
      //   this.ledger.enableLedgerEOS(store[pbk]['slot']);
      // } else {
      //   this.eos.clearSigner();
      // }
    } else {
      this.eos.clearSigner();
    }
  }
}
