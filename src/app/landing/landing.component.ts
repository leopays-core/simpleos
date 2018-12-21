import {Component, NgZone, OnInit, ViewChild, ElementRef} from '@angular/core';
import {EOSJSService} from '../eosjs.service';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AccountsService} from '../accounts.service';
import {Router} from '@angular/router';
import {ClrWizard} from '@clr/angular';
import {NetworkService} from '../network.service';
import {CryptoService} from '../services/crypto.service';
import {BodyOutputType, Toast, ToasterConfig, ToasterService} from 'angular2-toaster';
import {forEach} from '@angular/router/src/utils/collection';
import {RamService} from '../services/ram.service';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit{

  @ViewChild('wizardexists') exisitswizard: ClrWizard;
  @ViewChild('wizardnew') wizardnew: ClrWizard;
  @ViewChild('wizardexodus') wizard: ClrWizard;
  @ViewChild('wizardkeys') wizardkeys: ClrWizard;
  @ViewChild('customImportBK') customImportBK: ElementRef;
  lottieConfig: Object;
  anim: any;
  busy: boolean;
  existingWallet: boolean;
  exodusWallet: boolean;
  newWallet: boolean;
  newKeys: boolean;
  importBKP: boolean;
  endpointModal: boolean;
  // endPoint = 'http://api.eosrio.io';
  accountname = '';
  accountname_err = '';
  accountname_valid = false;
  ownerpk = '';
  ownerpk2 = '';
  ownerpub = '';
  ownerpub2 = '';
  activepk = '';
  activepub = '';
  newAccountPayload = '';
  agreeKeys = false;
  agreeKeys2 = false;
  check: boolean;
  publicEOS: string;
  checkerr: string;
  errormsg: string;
  accounts: any[];
  dropReady: boolean;
  passmatch: boolean;
  passexodusmatch: boolean;
  agree: boolean;
  agree2: boolean;
  generating = false;
  generating2 = false;
  passform: FormGroup;
  passformexodus: FormGroup;
  pvtform: FormGroup;
  importForm: FormGroup;
  pk: string;
  publickey: string;
  pin: string;
  pinexodus: string;
  lockscreen: boolean;
  lockscreen2: boolean;
  importedAccounts: any[];
  exodusValid = false;
  // endpoint = 'http://api.eosrio.io';
  endpoint:string;
  payloadValid = false;
  generated = false;
  generated2 = false;
  config: ToasterConfig;
  verifyPanel = false;
  choosedFil: string;
  disableIm: boolean;
  infile: any;
  total_amount: number;
  memo: string;
  openTX = LandingComponent.openTXID;
  openGit = LandingComponent.openGithub;
  openFaq = LandingComponent.openFAQ;
  busy2 = false;
  busyActivekey = false;
  chainConnected = [];

  static parseEOS(tk_string) {
    if (tk_string.split(' ')[1] === 'EOS') {
      return parseFloat(tk_string.split(' ')[0]);
    } else {
      return 0;
    }
  }

  static openTXID(value) {
    window['shell']['openExternal']('https://www.bloks.io/account/' + value);
  }

  static openGithub() {
    window['shell']['openExternal']('https://github.com/eosrio/eosriosignup');
  }

  static openFAQ() {
    window['shell']['openExternal']('https://github.com/eosrio/eosriosignup');
  }

  constructor(public eos: EOSJSService,
              private crypto: CryptoService,
              private fb: FormBuilder,
              public aService: AccountsService,
              private toaster: ToasterService,
              public network: NetworkService,
              private router: Router,
              private zone: NgZone,
              public ram: RamService) {
    this.busy = true;
    this.existingWallet = false;
    this.exodusWallet = false;
    this.dropReady = false;
    this.newWallet = false;
    this.check = false;
    this.passmatch = true;
    this.passexodusmatch = true;
    this.agree = false;
    this.agree2 = false;
    this.lockscreen = false;
    this.lockscreen2 = false;
    this.importBKP = false;
    this.endpointModal = false;
    this.disableIm = false;
    this.accounts = [];
    this.importedAccounts = [];
    this.checkerr = '';
    this.errormsg = '';
    this.endpoint = '';
    this.total_amount = 1;
    this.memo = '';
    this.busyActivekey = false;
    this.lottieConfig = {
      path: 'assets/logoanim.json',
      autoplay: true,
      loop: false
    };

    this.network.networkingReady.asObservable().subscribe((status) => {
      this.busy = !status;
    });

    this.publicEOS = '';

    this.passform = this.fb.group({
      matchingPassword: this.fb.group({
        pass1: ['', [Validators.required, Validators.minLength(10)]],
        pass2: ['', [Validators.required, Validators.minLength(10)]]
      })
    });
    this.pvtform = this.fb.group({
      private_key: ['', Validators.required]
    });
    this.passformexodus = this.fb.group({
      matchingPassword: this.fb.group({
        pass1: ['', [Validators.required, Validators.minLength(10)]],
        pass2: ['', [Validators.required, Validators.minLength(10)]]
      })
    });
    this.importForm = this.fb.group({
      pass: ['', Validators.required],
      customImportBK: ['', Validators.required],
    });

  }

  cc(text, title, body) {
    window['navigator']['clipboard']['writeText'](text).then(()=>{
      this.showToast('success', title + ' copied to clipboard!', body);
    }).catch(()=>{
      this.showToast('error', 'Clipboard didn\'t work!', 'Please try other way.');
    });
  }

  static resetApp() {
    window['remote']['app']['relaunch']();
    window['remote']['app'].exit(0);
  }



  resetAndClose() {
    this.wizardnew.reset();
    this.wizardnew.close();
  }

  private showToast(type: string, title: string, body: string) {
    this.config = new ToasterConfig({
      positionClass: 'toast-top-right',
      timeout: 10000,
      newestOnTop: true,
      tapToDismiss: true,
      preventDuplicates: false,
      animation: 'slideDown',
      limit: 1,
    });
    const toast: Toast = {
      type: type,
      title: title,
      body: body,
      timeout: 10000,
      showCloseButton: true,
      bodyOutputType: BodyOutputType.TrustedHtml,
    };
    this.toaster.popAsync(toast);
  }

  ngOnInit() {
    this.chainConnected = [];
    this.chainConnected = this.getChainConnected();
    this.endpoint = this.chainConnected['firstApi'];
    setTimeout(() => {
      this.anim.pause();
    }, 10);

    setTimeout(() => {
      this.anim.play();
    }, 900);

  }


  parseSYMBOL(tk_string) {
    if (tk_string.split(' ')[1] === this.aService.mainnetActive['symbol']) {
      return parseFloat(tk_string.split(' ')[0]);
    } else {
      return 0;
    }
  }

  getChainConnected(){
    const storeChain = localStorage.getItem('simplEOS.storeChain');
    let storeChainA = [];
    for (let chain in JSON.parse(storeChain)) {
      let idx =
      storeChainA.push(JSON.parse(storeChain)[chain[0]]);
    }
    return (storeChainA.find(chain=> chain.active ));
    //return
  }

  setChangeMainnet(chainID) {
    this.network.mainnetId = this.network.mainNet.find(chain=> chain.id === chainID ).id;
    this.aService.activeChain(this.network.mainNet.find(chain => chain.id === this.network.mainnetId).name);
    LandingComponent.resetApp();
  }

  setEndPoint(ep){
    this.endpoint = ep;
    this.customConnect();
    this.endpointModal = false;
  }

  setPin(exodus) {
    setTimeout(() => {
      if (exodus) {
        this.crypto.createPIN(this.pinexodus,'exodus');
      } else {
        this.crypto.createPIN(this.pin,this.aService.mainnetActive['id']);
      }
    }, 4000);
  }

  verifyAccountName(next) {
    try {
      this.accountname_valid = false;
      const res = this.eos.checkAccountName(this.accountname);
      let regexName = new RegExp('^([a-z]|[1-5])+$');
      if (res !== 0) {
        if (this.accountname.length === 12 && regexName.test(this.accountname)) {
          this.eos.getAccountInfo(this.accountname).then(() => {
            // this.eos['getAccount'](this.accountname, (err, data) => {
            //   console.log(err, data);
              this.accountname_err = 'This account name is not available. Please try another.';
              this.accountname_valid = false;
          }).catch(()=>{
            this.accountname_valid = true;
            this.accountname_err = '';
            if (next) {
              this.wizardnew.next();
            }
          });
        } else {
          this.accountname_err = 'The account name must have exactly 12 characters. a-z, 1-5';
        }
      }
    } catch (e) {
      this.accountname_err = e.message;
    }
  }

  generateKeys() {
    this.generating = true;
    setTimeout(() => {
      this.eos.ecc.initialize().then(() => {
        this.eos.ecc['randomKey'](128).then((privateKey) => {
          this.ownerpk = privateKey;
          this.ownerpub = this.eos.ecc['privateToPublic'](this.ownerpk);
          console.log(this.ownerpk, this.ownerpub);
          this.eos.ecc['randomKey'](128).then((privateKey2) => {
            this.activepk = privateKey2;
            this.activepub = this.eos.ecc['privateToPublic'](this.activepk);
            this.generating = false;
            this.generated = true;
            console.log(this.activepk, this.activepub);
          });
        });
      });
    }, 100);
  }


  generateNKeys() {
    this.generating2 = true;
    setTimeout(() => {
      this.eos.ecc.initialize().then(() => {
        this.eos.ecc['randomKey'](128).then((privateKey) => {
          this.ownerpk2 = privateKey;
          this.ownerpub2 = this.eos.ecc['privateToPublic'](this.ownerpk2);
          this.generating2 = false;
          this.generated2 = true;
          console.log(this.ownerpk2, this.ownerpub2);
        });
      });
    }, 100);
  }

  makePayload() {
    if (this.eos.ecc['isValidPublic'](this.ownerpub) && this.eos.ecc['isValidPublic'](this.activepub)) {
      console.log('Generating account payload');
      this.newAccountPayload = btoa(JSON.stringify({
        n: this.accountname,
        o: this.ownerpub,
        a: this.activepub,
        t: new Date().getTime()
      }));
      this.payloadValid = true;
    } else {
      alert('Invalid public key!');
      this.newAccountPayload = 'Invalid public key! Please go back and fix it!';
      this.payloadValid = false;
      this.wizardnew.navService.previous();
    }
  }

  makeMemo() {
    this.memo = this.accountname + '-' + this.ownerpub + '-' + this.activepub;
  }

  retryConn() {
    this.network.connect();
  }

  customConnect() {
    this.network.startup(this.endpoint);
  }

  importFromExodus() {
    this.wizard.reset();
    this.exodusValid = false;
    this.exodusWallet = true;
    this.dropReady = true;
    this.errormsg = '';
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.dropReady === true) {
        for (const f of e.dataTransfer.files) {
          const path = f['path'];
          this.dropReady = false;
          this.exodusValid = false;
          window['filesystem']['readFile'](path, 'utf-8', (err, data) => {
            if (!err) {
              const csvdata = data.split(',');
              this.pk = csvdata[csvdata.length - 1];
              this.pk = this.pk.trim();
              document.removeEventListener('drop', handleDrop, true);
              document.removeEventListener('dragover', handleDragOver, true);
              this.verifyPrivateKey(this.pk, true, path);
            }
          });
        }
      }
    };
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragover', handleDragOver);
  }

  handleAnimation(anim: any) {
    this.anim = anim;
    this.anim['setSpeed'](0.8);
  }

  passCompare() {
    if (this.passform.value.matchingPassword.pass1 && this.passform.value.matchingPassword.pass2) {
      if (this.passform.value.matchingPassword.pass1 === this.passform.value.matchingPassword.pass2) {
        this.passform['controls'].matchingPassword['controls']['pass2'].setErrors(null);
        this.passmatch = true;
      } else {
        this.passform['controls'].matchingPassword['controls']['pass2'].setErrors({'incorrect': true});
        this.passmatch = false;
      }
    }
  }

  passExodusCompare() {
    if (this.passformexodus.value.matchingPassword.pass1 && this.passformexodus.value.matchingPassword.pass2) {
      if (this.passformexodus.value.matchingPassword.pass1 === this.passformexodus.value.matchingPassword.pass2) {
        this.passformexodus['controls'].matchingPassword['controls']['pass2'].setErrors(null);
        this.passexodusmatch = true;
      } else {
        this.passformexodus['controls'].matchingPassword['controls']['pass2'].setErrors({'incorrect': true});
        this.passexodusmatch = false;
      }
    }
  }

  importCredentials() {
    if (this.passform.value.matchingPassword.pass1 === this.passform.value.matchingPassword.pass2) {
      this.crypto.initKeys(this.publicEOS, this.passform.value.matchingPassword.pass1).then(() => {
        this.crypto.encryptAndStore(this.pvtform.value.private_key, this.publicEOS).then(() => {
          this.aService.importAccounts(this.importedAccounts);
          this.crypto.decryptKeys(this.publicEOS).then(() => {
            this.router.navigate(['dashboard', 'vote']).catch((err) => {
              console.log(err);
            });
            if (this.lockscreen) {
              this.setPin(false);
            }
          }).catch((error) => {
            console.log('Error', error);
          });
        }).catch((err) => {
          console.log(err);
        });
      });
    }
  }

  importCredentialsExodus() {
    if (this.passformexodus.value.matchingPassword.pass1 === this.passformexodus.value.matchingPassword.pass2) {
      this.crypto.initKeys(this.publicEOS, this.passformexodus.value.matchingPassword.pass1).then(() => {
        this.crypto.encryptAndStore(this.pk, this.publicEOS).then(() => {
          this.aService.importAccounts(this.importedAccounts);
          this.crypto.decryptKeys(this.publicEOS).then(() => {
            this.router.navigate(['dashboard', 'vote']).catch((err) => {
              console.log(err);
            });
            if (this.lockscreen2) {
              this.setPin(true);
            }
          }).catch((error) => {
            console.log('Error', error);
          });
        }).catch((err) => {
          console.log(err);
        });
      });
    }
  }

  verifyPrivateKey(input, exodus, path) {
    if (input !== '') {
      this.busyActivekey = true;
      this.eos.checkPvtKey(input).then((results) => {
        this.publicEOS = results.publicKey;
        this.importedAccounts = [];
        this.importedAccounts = [...results.foundAccounts];
        this.importedAccounts.forEach((item) => {
          if (item['refund_request']) {
            const tempDate = item['refund_request']['request_time'] + '.000Z';
            const refundTime = new Date(tempDate).getTime() + (72 * 60 * 60 * 1000);
            const now = new Date().getTime();
            if (now > refundTime) {
              this.eos.claimRefunds(item.account_name, input).then((tx) => {
                console.log(tx);
              });
            } else {
              console.log('Refund not ready!');
            }
          }
        });
        this.pvtform.controls['private_key'].setErrors(null);
        this.zone.run(() => {
          if (exodus) {
            this.exodusValid = true;
            this.dropReady = false;
            window['filesystem']['unlink'](path, (err2) => {
              if (err2) {
                console.log(err2);
              }
            });
          } else {
            this.exisitswizard.forceNext();
          }
          this.errormsg = '';
        });
      }).catch((e) => {
        this.zone.run(() => {
          this.dropReady = true;
          this.exodusValid = false;
          this.pvtform.controls['private_key'].setErrors({'incorrect': true});
          this.importedAccounts = [];
          if (e.message.includes('Invalid checksum')) {
            this.errormsg = 'invalid private key';
          }
          if (e.message === 'no_account') {
            this.errormsg = 'No account associated with this private key';
          }
          if (e.message === 'non_active') {
            this.errormsg = 'This is not the active key. Please import the active key.';
          }
        });
      });
    }
  }

  doCancel(): void {
    this.exisitswizard.close();
  }

  checkAccount() {
    const _self = this;
    if (this.eos.ready) {
      this.check = true;
      this.accounts = [];
      console.log('HERE',this.publicEOS);
      this.eos.loadPublicKey(this.publicEOS).then((account_data: any) => {
        console.log('account',account_data);
        account_data.foundAccounts.forEach((acc) => {
          let balance = 0;
          console.log('account2',acc);
          // Parse tokens and calculate balance
          acc['tokens'].forEach((tk) => {

            balance += _self.parseSYMBOL(tk);
            // balance += LandingComponent.parseEOS(tk);
          });
          // Add stake balance
          // balance += LandingComponent.parseEOS(acc['total_resources']['cpu_weight']);
          // balance += LandingComponent.parseEOS(acc['total_resources']['net_weight']);
          balance += _self.parseSYMBOL(acc['total_resources']['cpu_weight']);
          balance += _self.parseSYMBOL(acc['total_resources']['net_weight']);
          console.log('account2',balance);
          const accData = {
            name: acc['account_name'],
            full_balance: Math.round((balance) * 10000) / 10000
          };
          this.accounts.push(accData);
        });
        this.checkerr = '';
      }).catch((err) => {
        console.log('ERROR',err);
        this.checkerr = err;
      });
    }
  }

  inputIMClick() {
    this.customImportBK.nativeElement.click();
    // let el: HTMLElement = this.customExportBK.nativeElement as HTMLElement;
    // el.click();
  }

  importCheckBK(a) {

    this.infile = a.target.files[0];

    const name = this.infile.name;

    if (name != 'simpleos.bkp') {
      this.showToast('error', 'Wrong file!', '');
      this.infile = '';
      return false;
    }
    this.choosedFil = name;
  }

  importBK() {
    this.disableIm = true;
    this.busy2 = true;
    if (this.infile != ''&&this.importForm.value.pass!='') {
      window['filesystem']['readFile'](this.infile.path, 'utf-8', (err, data) => {
        if (!err) {
          let pass = this.importForm.value.pass;
          let decrypt = this.crypto.decryptBKP(data, pass);
          try {
            let arrLS = JSON.parse(decrypt);
            this.showToast('success', 'Imported with success!', 'Application will restart... wait for it!');
            arrLS.forEach(function (d) {
              localStorage.setItem(d['key'], d['value']);
            });
            this.choosedFil = '';
            this.disableIm = false;
            this.busy2 = false;
            this.importBKP = false;
            LandingComponent.resetApp();

          } catch (e) {
            this.showToast('error', 'Wrong password, please try again!', '');
          }

        } else {
          this.showToast('error', 'Something went wrong, please try again or contact our support!', '');
        }
      });
    }else{
      this.showToast('error', 'Choose your backup file and fill the password field!', '');
      this.choosedFil = '';
      this.disableIm = false;
      this.busy2 = false;
    }
  }

}
