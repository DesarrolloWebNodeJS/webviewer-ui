import { saveAs } from 'file-saver';

import core from 'core';
import { isIE } from 'helpers/device';
import fireEvent from 'helpers/fireEvent';
import actions from 'actions';

// LPL wants it downloaded in original file format

export default (dispatch, options = {}) => {
  const {
    filename = core.getDocument()?.getFilename() || 'document',
    includeAnnotations = options.includeAnnotations !== undefined ? options.includeAnnotations : true,
    xfdfData,
    externalURL,
  } = options;

  if (!options.downloadType) {
    options.downloadType = 'pdf';
  }

  dispatch(actions.openElement('loadingModal'));

  return core
    .exportAnnotations()
    .then(xfdfString => {
      const doc = core.getDocument();
      if (includeAnnotations) {
        options.xfdfString = options.xfdfString || xfdfString;
      }
      else {
        options.xfdfString = `<?xml version="1.0" encoding="UTF-8" ?>
        <xfdf
            xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">
                <fields />
                <annots />
            </xfdf>`;
      }
      if (doc.getType() === 'office') {
        options.downloadType = 'office';
      }

      const getDownloadFilename = (name, extension) => {
        if (name.slice(-extension.length).toLowerCase() !== extension) {
          name += extension;
        }
        return name;
      };

      const fileNameParts = filename.split('.');
      /**
       * According to https://www.pdftron.com/api/web/CoreControls.Document.html
       * We can't download image files / other files as their own extension, must convert it to PDF
       */
      if (fileNameParts[fileNameParts.length - 1].match(/(jpg|jpeg|png|gif)$/i) && options.downloadType !== 'office' ) {
        fileNameParts[fileNameParts.length - 1] = 'pdf';
      }
      if (fileNameParts[fileNameParts.length - 1].match(/(pptx|ppt|xls|xlsx|doc|docx)$/i)) {
        options.downloadType = 'office';
      }
      const downloadName = getDownloadFilename(filename, `.${fileNameParts[fileNameParts.length - 1]}`);

      if (externalURL) {
        const downloadIframe =
          document.getElementById('download-iframe') ||
          document.createElement('iframe');
        downloadIframe.width = 0;
        downloadIframe.height = 0;
        downloadIframe.id = 'download-iframe';
        downloadIframe.src = null;
        document.body.appendChild(downloadIframe);
        downloadIframe.src = externalURL;
        dispatch(actions.closeElement('loadingModal'));
        fireEvent('finishedSavingPDF');
      } else {
        return doc.getFileData(options).then(
          data => {
            const arr = new Uint8Array(data);
            let file;
            if (isIE) {
              file = new Blob([arr], { type: 'application/pdf' });
            } else {
              file = new File([arr], downloadName, { type: 'application/pdf' });
            }

            saveAs(file, downloadName);
            dispatch(actions.closeElement('loadingModal'));
            fireEvent('finishedSavingPDF');
          },
          error => {
            dispatch(actions.closeElement('loadingModal'));
            throw new Error(error.message);
          },
        );
      }
    })
    .catch(() => {
      dispatch(actions.closeElement('loadingModal'));
    });
};
