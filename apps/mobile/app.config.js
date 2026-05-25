module.exports = ({ config }) => {
  const projectId = process.env.EAS_PROJECT_ID || '5fb169d2-85c2-48ef-990f-960a395e7c6a'

  return {
    ...config,
    extra: {
      ...config.extra,
      eas: { projectId },
    },
  }
}
