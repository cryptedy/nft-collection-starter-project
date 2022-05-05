//App.js
import "./styles/App.css";

import { ethers } from "ethers";
import React, {useEffect, useState} from "react";

import myEpicNft from "./utils/MyEpicNFT.json";

import twitterLogo from './assets/twitter-logo.svg';
import toast, { Toaster } from 'react-hot-toast'

// Constantsを宣言する: constとは値書き換えを禁止した変数を宣言する方法です。
const TWITTER_HANDLE = 'edyCryptoNFT';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const OPENSEA_LINK = '';
const TOTAL_MINT_COUNT = 50;
const CONTRACT_ADDRESS = "0x201b62e0ad7503fcF8a4EF9250f3eE043B4C98a6";

const App = () => {
  //ユーザーのウォレットアドレスを格納するための状態変数を定義
  const [currentAccount, setCurrentAccount] = useState("");
  //そのほかの状態変数
  const [isMinting, setIsMinting] = useState("false");    //ミント中かどうか
  const [mintedCount, setMintedCount] = useState(0);      //ミント済みNFT数
  const [chainId, setChainId] = useState(0);
  //この段階でcurrentAccountの中身は空
  console.log("currentAccount:", currentAccount);


  //ユーザーが認証可能なウォレットアドレスを持っているか確認
  const checkIfWalletIsConnected = async() => {
    //ユーザーがMetaMaskを持っているかを確認する
    const {ethereum} = window;
    if (!ethereum) {
      console.log("Make sure you have MetaMask");
      return;
    } else{
      console.log("We have the ethereum object", ethereum);
    }

    //認証可能なウォレットアドレスを持っている場合は、ユーザーにウォレットへのアクセス許可を求める。
    //許可されれば、ユーザーの最初のウォレットアドレスをaccountsに格納する。
    const accounts = await ethereum.request({ method: "eth_accounts" });

    if (accounts.length !== 0){
      const account = accounts[0];
      console.log("Found an authorized account: ", account);
      setCurrentAccount(account);

      //チェーン確認をする。イベントハンドラを流用する。
      const hexcid = await ethereum.request({method: "eth_chainId"});
      await checkChain(hexcid);
      await getTotalSupply();
      //イベントリスナー設定
      //この時点でユーザーのウォレット接続がすんでいる
      setupEventListener();


      //await getTotalSupply();
    } else {
      console.log("No authorized account found");
    }
  };

  //connectWalletメソッド
  const connectWallet = async () => {
    try {
      const {ethereum} = window;
      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }
      //ウォレットアドレスに対してアクセスをリクエストする
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Connected", accounts[0]);
      //ウォレットアドレスをcurrentAccountに紐付ける
      setCurrentAccount(accounts[0]);

      //イベントリスナーをここで設定
      await getTotalSupply();
      setupEventListener();

    } catch(error){
      if (error.code === 4001) {
        // EIP-1193 userRejectedRequest error
        // ユーザーが接続を拒否するとここに来ます
        console.log('Please connect to MetaMask.');
      } else {
        console.error(error);
      }
    }
  };
  //Mintメソッド
  const askContractToMintNFT = async () => {
    try {
      const {ethereum} = window;
      if (ethereum){
        if (chainId == 4){
          const provider = new ethers.providers.Web3Provider(ethereum); //Wallet経由でEthereumノードに接続
          const signer = provider.getSigner();                          //getSignerで署名準備
          const connectedContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            myEpicNft.abi,
            signer
          );
          console.log("Going to pop wallet now to pay gas...");
          let nftTxn = await connectedContract.makeAnEpicNFT();
          console.log("Mining...please wait.");
          toast.success(`Transaction was sent.`,{duration:5000});
          await nftTxn.wait();
          await getTotalSupply();
          console.log(
            `Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`
          );
        }else{
          toast.error('Cannot mint NFT because invalid network is selected. Please change network to Rinkeby.',
          {duration:5000});
        }
      } else {
        console.log("Ethereum object doesn't exist!");
        toast.error('Metamask is not ready.');
      }
    }catch (error) {
      console.log(error);
      toast.error('Fail to mint.');
    }
  };

  //Mintメソッド
  const getTotalSupply = async () => {
    try {
      const {ethereum} = window;
      if (ethereum){
        //ウォレットチェック時にこの関数を実行すると、chainIdが更新される前でエラーになってしまう。
        //そこで直接IDを取得し処理を行う。
        const hexcid = await ethereum.request({ method: "eth_chainId" });
        const cid = parseInt(hexcid);
        if (cid == 4){
          const provider = new ethers.providers.Web3Provider(ethereum); //Wallet経由でEthereumノードに接続
          const signer = provider.getSigner();                          //getSignerで署名準備
          const connectedContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            myEpicNft.abi,
            provider
          );
          let count = await connectedContract.totalSupply();
          //console.log("MintedCount:",count,count.toNumber());

          setMintedCount(count.toNumber());

        }else{
          toast.error('Cannot get total supply because invalid network is selected. Please change network to Rinkeby.',
          {duration:3000});
        }
      } else {
        console.log("Ethereum object doesn't exist!");
        toast.error('Metamask is not ready.');
      }
    }catch (error) {
      console.log(error);
    }
  };
  //setupEventListner関数を定義
  const setupEventListener = async () => {
    try{
      const { ethereum } = window;
      if(ethereum){
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        //コントラクトインスタンス作成
        const connectedContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          myEpicNft.abi,
          signer
        );
        //Eventがemitされる際に、コントラクトからの情報を受け取る
        connectedContract.on("NewEpicNFTMinted", (from, tokenId) => {
          console.log(from, tokenId.toNumber());
          toast.success(`NFT was minted.`,{duration:5000});
          /*alert(
            `NFTをミントしました。リンクはこちらです: \nhttps://testnets.opensea.io/assets/${CONTRACT_ADDRESS}/${tokenId.toNumber()}`
          );*/
        });
        console.log("Setup event listener!");
        //メタマスクのチェーン変更イベント検出
        ethereum.on("chainChanged", handleChainChanged);
        window.addEventListener("unload", unloadProcess);
        console.log("Setup event listener for chainChanged!");
      }else{
        console.log("Ethereum object doesn't exist!");
      }
    }catch(error){
      console.log(error);
    }
  };

  const handleChainChanged = async(hexcid) =>  {
    const prevCid = chainId;
    const newCid = parseInt(hexcid);
    setChainId(newCid);
    if (newCid == 4){
      toast.success("Network is changed to Rinkeby!");
    } else{
      toast.error("Changed network is invalid. Please change one to Rinkeby");
    }
  }

  const checkChain = (hexcid) =>  {
    const newCid = parseInt(hexcid);
    setChainId(newCid);
    if (newCid != 4){
      toast.error("Selected network is invalid. Please change one to Rinkeby");
    } else{
    }
  }

  const unloadProcess = async() => {
    try{
      const {ethereum} = window.ethereum;
      if(!ethereum){
        //何もしない
      }else{
        ethereum.removeListener('chainChanged', handleChainChanged);
      }
    }catch(error){
      console.log(error);
    }
  }
  // renderNotConnectedContainer メソッドを定義します。
  const renderNotConnectedContainer = () => (
    <button 
      onClick={connectWallet} 
      className="cta-button connect-wallet-button"
    >
      Connect to Wallet
    </button>
  );

  //ページがロードされたときにuseEffect()内の関数を呼び出す
  useEffect( ()=>{
    checkIfWalletIsConnected();
  }, []);

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header gradient-text">My NFT Collection</p>
          <p className="sub-text">
            あなただけの特別な NFT を Mint しよう💫
          </p>
          {/*条件付きレンダリングを追加。すでに接続されている場合はconnect to Walletは非表示にする*/}
          {currentAccount === "" ? (
            renderNotConnectedContainer()
          ) : 
            (mintedCount < TOTAL_MINT_COUNT) ? ( 
              <><button onClick={askContractToMintNFT} className="cta-button connect-wallet-button">
                Mint NFT
              </button><p className="sub-text">
                  {mintedCount}/{TOTAL_MINT_COUNT}
              </p></>
            ): (
              <p className="sub-text">
                  Mint is closed.
              </p>
            )
          }
        </div>
        <div>
          <Toaster />
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
