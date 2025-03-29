import Arweave from "arweave";

async function UploadFileToBlockChain(
  file: File | Blob,
  fileTypeOverride?: string,
): Promise<string | undefined> {
  const isFileTypeSupported =
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "application/json";
  const isFileSizeSupported = file.size <= 5000 * 1024; // 150kB in bytes

  if (!isFileTypeSupported || !isFileSizeSupported) {
    console.error("File type not supported or file size too large.");
    return undefined;
  }

  const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
    timeout: 20000,
    logging: false,
  });

  // Determine content type
  const contentType = fileTypeOverride || file.type;

  // Handle JSON data differently
  let data;
  if (contentType === "application/json" && !(file instanceof Blob)) {
    data = JSON.stringify(file);
  } else {
    data = await file.arrayBuffer();
  }

  const transaction = await arweave.createTransaction({
    data,
  });

  transaction.addTag("Content-Type", contentType);

  // Your signing mechanism here (placeholder)
  await arweave.transactions.sign(transaction, {
    d: "bRw51I_JUbzYAlBnnEizYmrIAXmYlzonLR1OWZN42q2DU4jv-56arM0e-Ijz7Gb_p43WMhxopudsXH1jsYHDwKz_2N7o9T9xHd_CMHrVsXlmpnr9gUJvvbzPEQqDAxpaYw0QxW9Q_oBiJ-nni6qYhFqq-b9a5DcnGLgH7OzIwUYxGpE5iPyUNVMltGOgogdeqOdShg9mBRCJg119mykKrIX9VRAXEoWiLLu-reB5r7CrDvoThqUm8VxLJ0wy4qXYzz1fMc77yY-I0j-kiVW9pItACmxjTHHMTAT-8x__HIGGuoqL1U5kJAEOYbq6ZrLgt01yv7dIT2jvhwAiFiZ3N27YZJjLNGBewSI1l599tMi3No_lf8fjNwcRe6OlVubN4l5yJBt21gqffIYwLczYCTth0kQjhemd2RaED3tynfj533S8Qricdf3OaYK2Y52BxOMCyEtFmoXza1KECjdnVdnKIyo2BKVl09rcUzYhWtHb3lcwIvijEkSEndsTFeGouh2baSLAKUI131xFq8mOIPjX5i6g1O8y7ea82gXBD4J0hCvF8ZUTDspjaDwuRI1xtARWG203giLOTh8Zr33ZE6UivHEke5QQwLE9GZUJBdMeOm473TCqtK2DG4pAKPPqS_2UETZOZBtHK4FskZQwHKwZF_9xJd3SxSmoat1UzgE",
    dp: "frsG7JujHtptVQe4EWM403f0PCjCwH_MQWby1n1Prg4swCaczq0Qg0VIrWm3KByPVuZSX6osxvss58l15-iV_pGN-__rOBPSXVXFmpm-p4Mzr84OXwnFvkv7-ICExDYM2bI4PJOHb9g40R_ObAulsRfJTThrI7PjHuuk_Ull80e3iWg9IiTC8ZeNaH_6Wzm7C7BW3d4oEfI4dxk_R3jKElx-mEvLTo3hMoxgZYxawL-hHo3xwwSpQdPpMz-BqZN-6oE5bkRgASUkuFEvhjhWV30BNrDYmV_6eplU-cfPbji-oz-SYaJBl4AQjLc-UPh_jvSN0IK3PPajcbY6g1Vk_Q",
    dq: "ZCnfxtOF87eilUqTaSybR_HtPqUb_L4U9niA9thmF0d668FSGKb0_8r_Rhmup8-ts5b0Kb0y__MS3mmw6bqCJ_qmQnzizmRNNYW7TY7ekcUJum75e11byvnBULdE_PhvY4xoLJXVPOXiG-S6Mtfj5LYnlaWFTkbLi5w-axzMzIxeE1cdVYJcXGWDOWLzMwE4qc0c2TYus4wssOhRvrI-g0f-RybN8dpKY73eNx7wutkFmi-eaet_78XwseVhbVySi_UDGE3A-Mq0aDBgs1LIR8eXp-IvKxTSFyPSVtAHqBhOuCzrZwfFr-RQs7PXU5Q3tsUkKXlg1vEXV5Phja_N4Q",
    e: "AQAB",
    kty: "RSA",
    n: "pvrsotlkxgbZZrpI3QrzGzNgiJgLMhZ3sr5oGvvCGuo6cl8wqfTxSmmRwKIZ21Yz1QoTzHYwUlpPgZzQmaRmvWLax8y-dWjR1YmvRm0rpBPY-aY2BK-1x1suO4zE7Gyj7IhR_BQ4Ur4_FMec2NhhE2M65bX_KRe9hjxbd-wLLdtJIHx2L3pEr6cErxcg-_uatg11fLAQMOo7UxyOeHWuWbicQhOuJDsK3sAISH7fn9c5DS6knQJUNWP6eVMha_18a3LpLudzvIpqd1KhyxKlJhKturrhltGFFIYpwDJrZBlFLWRrgbYGhLGhnN5C3bG1jTZXBafD-Tdr14oGiqThVrvuLsksoH1uGlk3C8X_RLm1wrpWimBff5lW6u5OdWRgiPEiPcdR8hipkOSCrR-h2HUZp3Y9sJhauQpV0bYcGWPFkHaHeh5lpfqZ4-Ew0bGZZW17mkNxd3PT_JZN6w3nd2_TIUGRvv2LbKAPJxg6BS6TEpybrh2KQb-CXliJJiYtPe_fGncVGJEWEy7lhjwcmpHYPiPINvKZ8Y0_qFdUvbF_ebShxoyG3jzDKl9y2Dg3xDHUpe73AAKxwkRHvSlM-jiGAynEAEdUmXMxWjPLG2IGwiWgUGyHVFQfOA6Kn6Vm8C_bkgFaqXlCeeNoU4H24n6jPOZuQHyx-SxlSpxYFZU",
    p: "3nW-RJJ800GLt9GEpzE2hgBsT7XwTnWupR7yURcIhMnbagXcwEBIvVfiO34bpUS1Zpi14mVcXNdb1xg5HPW1DIm-chHWDMLHQP80RbA8dV_VH86eRuoVhGkW94V9oQ1YBPxDN1cFLDCiGteI4cvN0CK9S_cIojLbH2OUyvqOqwHZn4XUHm4PR4pwhWOBY9DJImyIqH5C6OM5hHAVniBAXbyhm3s_uRS9f5wTL1aARYRpVgM5kdrL8_6tRDk4PYcI-cEfU01ooAvjilmJFaxrRGR4n5YgJXg_UerWPh1Xg5c7wd1iV5f2d6K_UybEznAA0a7Ofnwe6I49s0GLyY5bZQ",
    q: "wCfWCl21BvsldeJ65RkEdJTGI0xKaVErbDSC_DA8i_bYHN4Y7IJfdeA_6iAjgFrOGfaOWwszfYj9t9MnEV23JlvcEZa89LUx4HVjOfFQM9LS_SSGEKCZSzQVXE_V8nZIifj72x20J3hi7iQqUjyR1QBgfMshrNnAM511PeCORUfTCRs1C42R8_5_mDamA-ZeeSvrAUvwyScS7-0TZr0XG2aZvAZz6uZEt7AKtVs6LfbrxqrUviy01SpAxj00GhAn3tgziV2yJPyMAQ4UcMqYzQbf_3ln6s7Gbtx51mH56oH973OBPHAkJanTqth4je1pCghx5Nq2su8oAaSOJwHmcQ",
    qi: "THccoHCaMe2UVUORSyX7lZa34PObEgkph9fKLrA2wlJO57f7Lz8Vo6y6FJ3fJ84VHsrmwZ6B1XpSNxkftKkKeIeLaQDt0SwnuXdd795TgJp5dTo4XRar1XKKisfnfCc6c2wCdtvLl65TPTdO0-TUfcbxidETJfEHMxWb9Ox0N9vTiL96yLIeh4rOMoOgBN0cHd-DlPSsbDX7SBV4ujS1E9Hsud3DN5pIdnFlqYZPK-GLpCZQXfUty6SdtKdLKklgre8IXI9kTArmxYE9rhXqnWoXImv3lVapuML_ISd447VdxRnpFyEaWpcqtZj8Nb-8HqY07AQUiKyn7PLmAhZCyw",
  });

  const response = await arweave.transactions.post(transaction);

  if (response.status === 200) {
    return `https://arweave.net/${transaction.id}`;
  }
  console.error("Failed to upload to Arweave:", response.status);
  return undefined;
}

export default UploadFileToBlockChain;
