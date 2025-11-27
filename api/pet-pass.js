const { PKPass } = require("passkit-generator");

function getBufferFromEnvBase64(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return Buffer.from(value, "base64");
}

module.exports = async (req, res) => {
  try {
    // 1) Read pet data from query params (sent by your app)
    const {
      name = "Fido",
      breed = "Golden Retriever",
      microchip = "123456789",
      vetPhone = "",
      insurance = "",
      ownerContact = "",
      id = "AH-123456"
    } = req.query;

    // 2) Load certificates from env vars
    const certificates = {
      wwdr: getBufferFromEnvBase64("PASS_WWDR_CERT_B64"),
      signerCert: getBufferFromEnvBase64("PASS_SIGNER_CERT_B64"),
      signerKey: getBufferFromEnvBase64("PASS_SIGNER_KEY_B64"),
      signerKeyPassphrase: process.env.PASS_SIGNER_KEY_PASSPHRASE,
    };

    // 3) Build the pass using your template + overrides
    const pass = await PKPass.from(
      {
        model: "./AskHarveyGeneric.pass",
        certificates,
      },
      {
        serialNumber: id,
        barcode: {
          message: id,
          format: "PKBarcodeFormatQR",
          messageEncoding: "iso-8859-1",
        },
        generic: {
          headerFields: [
            { key: "idNumber", label: "ID #", value: id },
          ],
          primaryFields: [
            { key: "petName", label: "Name", value: name },
          ],
          secondaryFields: [
            { key: "breed", label: "Breed", value: breed },
          ],
          auxiliaryFields: [
            { key: "microchip", label: "Microchip", value: microchip },
          ],
          backFields: [
            { key: "vetPhone", label: "Vet Phone", value: vetPhone },
            { key: "insurance", label: "Insurance", value: insurance },
            { key: "ownerContact", label: "Owner Contact", value: ownerContact }
          ]
        }
      }
    );

    // 4) Send the .pkpass file
    const buffer = pass.getAsBuffer();

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${id}.pkpass"`
    );
    res.status(200).send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
};
