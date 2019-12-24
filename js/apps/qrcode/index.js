import React from 'react';
import { Input } from 'antd';
import styled from 'styled-components';
import QRCode from 'qrcode.react';

export default class PC extends React.PureComponent {
  state = {
    value: '',
  };

  render() {
    const { value } = this.state;
    const datas = value.split('\n').filter((d) => d);
    return (
      <StyledDiv>
        <Input.TextArea
          autoSize={{ minRows: 10, maxRows: 20 }}
          value={value}
          onChange={(e) => {
            this.setState({ value: e.target.value });
          }}
        />
        <div className="con">
          <div className="qrCodeBox">
            {datas.map((d) => <QRCode size={280} value={d} includeMargin />)}
          </div>
        </div>
      </StyledDiv>
    );
  }
}

// 15分钟
// guangliang22
// 1A3A201911231511{"ep":"049476675fd8727f88547f587b68b099cce17df2b7c651439dce18d47d89d94f2d5f3df676143a919850aebe4f0a716beec5bec0a2bd490a2619efe10f75bd4b56d72dd012cc5cf1b923f3cec679d95e88d3a786c3e87bcf2d78ad49f9023f2abf18359b1e9a2258db202b5e8234facaa886c1f51a43b386f129991a72154a9de1942b79e8ebd824d257a506e42ebc699e","ea":"guangliang22","mk":"","mki":"az9ov9cRED","vc":2}
// 2A3A201911231511xpub661MyMwAqRbcEkRJNeASZdTBaFovPbo9dW3f8pLuYq8eyhHB4onomdCxfkEf2gFAhh7QzUcmmTJvhqnmeTPWjfVTfxAZToXc8GxzuMscQf3xpub6GFnTkH7pLDDLN8iQJWjuCz7RiDs5p4pJuntpYNAS25aoPYcXAYw5R9rL3X7hyGVj26yLDnorXN7dK31jD3GN9vXYktDVJBySsujPj6y5Dqxpub6GFnTkH7pLDDN3qNZK9B5BpAsvTjR79dWdDwX9MP5BA4dKmf5xYVtWWybD4S1ZUJgqYbX69MvzN2xn3rAp1C8wTkg6Kus5MWgzNsifCVQwqxpub6GFnTkH7pLDDSQknNpJsJHkZZ9LcHU8s9WmCcB5Ds2325o5DuhEnRrgGXmror6ZQyxA8cxP7Y7d6CSFoo1SLDh8sJjpMwvNGQEhwDVkFHnn7c98e7dc9a5b540e05079bd612c1542e8d488376eff163fb3f4fea64200debee0a8a0b4d106db852649dac3b663b18e25a419c95fb20becd446d80cebb240da3e6f4ea15bcf88dc8ef5c9faaa64406538d009a93d5b590d31e274fbb89af799e83c987adc5b1f005d8ccc47ab9aaf2xpub6HbmQ5eNWnHM1i6ojyzjRsshitvRSJpJzs4SVr1cQrZPtZR2oykwmGWf1UJi8sUJiCrgUhv1Q9PPh6S8yKcs8vyraqbDxHXTJ5gqXzkEwNW
// 3A3A2019112315110GZ7AHF04E6SYQTQU5XELJL8606C791FDZ9MQUHL03840ET2NW4JNNATFOYNWNSKE0ZFJ3QCIU265DAGU4UQJZR1BCME4ZASLWIA5UJBFGCTDDG5EG90BENVK6NFEUJH80E0HD88RKZX9AQUGQLKUPCPB7PTVYWTRJGI074U4M6O2JHMRX15LFYSZI3FNRRDXR3UN4BFPDVT2GKCS34R5IMRGA50QWTT0KQDI806WTVT98IHGHLK8DVU1QERHFZFABEX89R6Y1A6NKTJI1CN02LQ630TXN02SB3Q9MFSBJ92MGHN8KGISMQBD8MTU514ANP2P2M499IOGEK63D50UFK9XGPERVFPD35FRMRPX7QZH6YF9F08NI0RHO2HZEO8BGABF2I41OZYPL224RQDCXGMQZP60F17BHZV50U79EJYCA49B27SQD8D1GE9V6R2V0RYFIPB1EVZ0QLG965CPGXN2X31YCGV3FK0S8EGBUXHV48KGZSWR9TF7HQWHJCBZWBIA6X3DAGJZALCOG96P7UZ1PZ4B4PKPMKWHHQDPBLW1BSS36ZTPEX10B3U95L8MUAY04TNS8FPR1BY9QN1Y1Z91BO6FSKVNCPO0OK4FF8XD5M9RZPWX3XLRV0TZCK0RYYCSB51BAEVORVI6PKGW02HIHJL3KPAI8QL8NR2V3SICT3U1X

// llichengxiu5
// 1A3A201911231511{"ep":"041aa7119235569b045cba00c1e4af6ebd030787445619a9d215c0406eab65bcc6025cec0251eff8e00c2ff7ef99a3e9c5d543a7cb3d2ba812e3730a7edba88ece6d7d43a329dc7985d11e8fd9d9db0fc133e178c1c90816e58837fd6b292800d672231c82371664fd377646a2b1cafd4d8a91283f94d68758dde37cfb527f780ebf3cdb9384c0ece5648594816f6ea22e","ea":"llichengxiu5","mk":"","mki":"5mhiqytdBL","vc":2}
// 2A3A201911231511xpub661MyMwAqRbcGNBKrfocUzQqaMVTAvWx5YQ8o5RaqUsxjbG49STs7DHRZx8nyrz7wNCdnpDynoVnNiD4W6bzGkFTaBCBaZbQ8QbNZreiJN9xpub6FnQ6VrS91Aaab364fGWNXyqmrkZuH4puRz4bfuS3SBZuVxTK9upyWwtu9meF4ua16tdsmNY2CKNDEXhoi4MLUpsqMBeL6Jnx53WzbqiaKSxpub6FnQ6VrS91AabzMEraE3nAZXHKAv7SpAXA4Uo1zrnfLVk9WsANwaqFd7Zvk82cxw9JgnvAYsyFQRscDUHj4raMwmnAc7skHzTXoauEU4qYFxpub6FnQ6VrS91Aadz18r3Wngt1sapannT3SXpNCbKktdLTwCKTYhYtdkU23dh7UU6RnkhDMkJi55MXSfCP43TprpgZki7Zt5VMFhN8pMN6NhBk7c98e7dc9a5a641c0802e6ce00d26c6f8348d64fe6c153c64717cd752d0fb4f45ca8647f023fd56b6ffaa470773749c53255ce9b8f41a6e46969b9b89e0670d9efd4894196ba8bcbfd559699ab7c677afe7488b5ca92bcc0435879f8abbc41a4bbb19db3ffb4bd58c5f9ac4fd7a6adxpub6JRZM8qFjYz9nimNsKAWhAMRtsaG2rGXHLPtQS8dAo9tRn28aZdRGDJYUrBSt4dRoY3Xz2T6QE3V7WRtCCit4acZKm8hQJqAzyT9UKGb5i6
// 3A3A201911231511030ZGGLSXVVN1FR0HONZL2SOLY0HXPZ7GOJOHF37K8EWWZJ5GLJOSZFOHUCLBN520A43V7NQZR8IQ7EUCSDFRT4YUM4OIWDRIJW1T93LGNNSGMTDDBXMT20JLMXS5ZPEPCAUEAUJD9L9O5XODO0KH0C5Z6V7HRKUUEUWVO2YS4TI6H2A2CRWGRHPPE6RLBV3PGTADZO68ROFDT1RWB0AUJBRM8KRY1Q3KD9YDU03JCBP5QM1OYTWPQNIRBMA9VQNVET6GZO6XODIIOGP26WBYEEGS8YZH0GD96RHWLGSVKUUNT890EVCZRTRV5RSFUF294XW4S9R06VSDM9NGS4ENC5V234F6PHL3A22DEMV8M3YN2XZBURV0YXI332GF8CTMX322EC3KJMFDYID0OUHPW1FXVMEOH4O7YGRLFQ61MY6MXP50A5UAM3M2IVYJFZ1STUYXHW8TG7J02GM5E45UB8CNA5C7FAMPXRKZVU4B3T6K05KHYW622OHEGWMAI3WOR6TG6ASYPA7ELJQP8FR0RHXO03OQGZQQRKEJG05B4A6APUJKL9B820249AJTRZJKCO2AKCIJK7YH4O5HHWBLBW2RCM1W7LDZO0BPM7R21K17UWPE83JTBUOGHCBD7GY0K5Y80AVX8OPPALA9CE409B0YHTII0SE874YQN2BHWAJE92J0U

// guangliang12
// 1A3A201911231511{"ep":"047131a06b60af0e93174fed389ea8a4c211d7d1478386296799a1e23f49df525365c05dd7811efd045ef0de9dafff33784c4108b4783e52129eb488e8f6c2afbe1f93a86d1a7454312e5fc83a2b0f23dbc726673fd966e54cb373b6babc827d51d315eac22b85aab494f079938476ecbb72a435d642bae8c33af32f7294b0812222c2de1cb85af69541f9fb7e17adb1e3","ea":"guangliang12","mk":"","mki":"hzVb4tJBtE","vc":2}
// 2A3A201911231511xpub661MyMwAqRbcGU5J15PbkbtF9QPh2tGin2V1cZAMTSHxaCaVR7bvhNYEh8UejNM6xvTRjcJjKHcaZSLN5EmNTTmKyijiX73F9VM5Nqxjd9dxpub6FrzePNsEmzq6Rx3ot2tkoyULXX35SpgFsUCAX1f8XA45aabvxR6g4HwY9UJCFYuh8D3zK2hHT2gCJXVCesjTEkxvZogxj5QHKuNj96fzUZxpub6FrzePNsEmzqA6xP4tNaqu75XrJqbZeg1tcfN9VMjs73c89hGGup25nTgP2DY6nts8Dv3mwWcG5of67AtEwxLUuY8Q6txzuCrJJD1CjF1Ucxpub6FrzePNsEmzqAe8keE5fzRFdrH1EFPT9o8pZtHdTJJYr3mXCkKZXc7osAVgc7hCJ2jx59viViKL1Gb5fXr5GZUcGJz6BHSrv6ovCykoky8x7c98e7dc9a5b4d1c310edcb244a55a24b557886ceedb59c03270ae64222fe9d56d895754217df6757e83a50c553670c0284acad28b17b4e86249bae3a8127b9feddd8f4d88bbb7cbdf67bbacfd1a776e89259ca0f5a0bdcf09147bf6cf8c6ef5838ec18ac9e59155cedd836edbb18fxpub6HyYnDLtqTBSj3DxkTKQWbyhkRwptJTCr8r6eh9xip6o5TwBfArc9eJHHDYSLgJkhRuGCk7nNYk1dm1qubsihE4J5tXV1p9UScSFBi7QT7W
// 3A3A20191123151111ZZ1QT7T9AQX6REX5EYJE45BB701CNH5FN7EFDQRA1WXPVVN6KC2OPO26QIO451DDHVW0TM94RBKJMF2TB1T3UQZ04QO1NVUHVAIOZ9A6CVXP4VOBSFZ1SCVFLKSIN7TU6SF4CZHTFFEQWC4FQH7O1OWDWBYCLXFOVZ5Q37TAMXE6J4LEXGYVPHAWBV9721SF6H6LTZ0KT91PTPVLAR7ZNMVM3QV6P1UZCY46059GCWUVJZNFQRYKY0ZE8DBY5KLY0971VKV1C0T9L9CCGXWT0KJ1K7DCHHOWXAHR8NOJ3U55O3ZGWYES7AQ5GKYAWZ0IRKJ1ISMRQE24Q9K6PS7W2D854JDAKAVVY9DT3EH3X25DS9EZST4DFJLRZVAL9ZSK8DYCNJNDTTVO04KTK968DFBKTKM4KJCIBBOKUH8WSWYH8JHL4FRAX457VSOV67N1DUWNZD3GPD0MDTZR31O9SN52DJLA4D32W2959PENXD2ZJQRQOJIUW4910Q3PVL8DDD0F5EF5GI1WHN20CYCYTJX00S3D47FJR3WE3WVU3XV6UCUD6662LPH07HSI4C0AI46BX4KT89OW8093X40LNQO0BD7HJL390GZWV1G7GA8RFN3TKVIMNUW7U2RTWHVADLE3HFJQV59L4GDOJE5FB6UBR5ZHT5Z1SXTP5DZ61P4SLE4Y

const StyledDiv = styled.div`
  textarea.ant-input {
    height: 100px;
  }
  .desc {
    margin-bottom: 0.15rem;
    text-align: center;
    font-size: 0.16rem;
    line-height: 0.2rem;
    color: #828387;
  }
  .qrCode {
    width: 2rem;
    height: 2rem;
  }
`;