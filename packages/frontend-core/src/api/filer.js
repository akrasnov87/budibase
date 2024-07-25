export const buildFilerEndpoints = API => ({
  /**
   * Uploads a file
   * @param data data
   * @param folder folder
   */
  uploadFile: async ({data, folder}) => {
    return await API.post({
      url: `/api/filer/${folder}`,
      body: data,
      json: false,
    })
  },

  /**
   * Gets a list of all files
   */
  getFiles: async ({folder}) => {
    return await API.get({
      url: `/api/filer/list/${folder}`,
    })
  },

  /**
   * Deletes a file.
   * @param filePath file path
   */
  deleteFile: async filePath => {
    return await API.delete({
      url: `/api/filer/${filePath}`,
    })
  },

  /**
   * Get file.
   * @param filePath file path
   */
  getFile: async filePath => {
    return await API.delete({
      url: `/api/filer/${filePath}`,
    })
  },
})
