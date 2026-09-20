import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

test('cluster area search, create with map coordinates, recover a failed edit, and delete', async ({ page }) => {
  // Test our real WebGL map interactions without depending on a public basemap.
  await page.route('https://tiles.openfreemap.org/**', async (route) => {
    const url = route.request().url()
    if (url.endsWith('/planet')) {
      await route.fulfill({ json: { tilejson: '3.0.0', tiles: ['https://tiles.openfreemap.org/test/{z}/{x}/{y}.pbf'] } })
    } else if (url.endsWith('.json')) {
      await route.fulfill({ json: {} })
    } else if (url.endsWith('.png')) {
      await route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=', 'base64') })
    } else {
      await route.fulfill({ contentType: 'application/x-protobuf', body: Buffer.alloc(0) })
    }
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  const list = page.getByRole('region', { name: 'Asset list', exact: true })
  const map = page.getByRole('region', { name: 'Asset map', exact: true })
  for (const panel of [list, map]) {
    await expect(panel.getByText('150 matching assets')).toBeVisible()
    await expect(panel.getByText('All locations')).toBeVisible()
  }
  await list.getByRole('button', { name: 'Next page' }).click()
  await expect(list.getByText('26–50 of 150')).toBeVisible()
  await expect(map.getByText('150 matching assets')).toBeVisible()
  await page.getByRole('button', { name: /^Expand cluster:/ }).first().click()
  await expect(map.getByRole('button', { name: 'Search this area', exact: true })).toBeVisible()
  await expect(list.getByText('150 matching assets')).toBeVisible()
  await page.getByRole('button', { name: 'Search this area', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Remove area filter' })).toBeVisible()
  for (const panel of [list, map]) {
    await expect(panel.getByText('Searched area', { exact: true })).toBeVisible()
    await expect(panel.getByText('150 matching assets')).not.toBeVisible()
  }
  await expect(map.getByRole('button', { name: 'Search this area', exact: true })).not.toBeVisible()
  await expect.poll(async () => map.getByText(/^\d+ matching assets?$/).textContent())
    .toBe(await list.getByText(/^\d+ matching assets?$/).textContent())
  await map.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect(map.getByRole('button', { name: 'Search this area', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Add Asset', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Create asset', exact: true })
  const name = `Browser smoke ${randomUUID()}`
  await form.getByLabel('Name', { exact: true }).fill(name)
  // Older than the seed: successful creation must reveal an asset off page one.
  await form.getByLabel('Installed (UTC)', { exact: true }).fill('1900-01-10T12:00')
  await form.getByLabel('Last inspected (UTC)', { exact: true }).fill('1900-01-10T13:00')
  await form.getByRole('region', { name: 'Map', exact: true }).click()
  await expect(form.getByLabel('Latitude', { exact: true })).not.toHaveValue('')
  await expect(form.getByLabel('Longitude', { exact: true })).not.toHaveValue('')
  const createdResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/api/assets'))
  await form.getByRole('button', { name: 'Create asset', exact: true }).click()
  const created = await (await createdResponse).json()
  const details = page.getByRole('complementary', { name: 'Asset details' })
  await expect(details.getByRole('heading', { name, exact: true })).toBeVisible()
  await expect(details.getByText('Jan 10, 1900, 12:00:00 PM UTC', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: `Select ${name}`, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove area filter' })).not.toBeVisible()

  let failNextEdit = true
  await page.route(`**/api/assets/${created.id}`, async (route) => {
    if (route.request().method() === 'PATCH' && failNextEdit) {
      failNextEdit = false
      await route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Temporary save failure. Try again.' } } })
    } else await route.continue()
  })
  await details.getByRole('button', { name: 'Edit', exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'Edit asset', exact: true })
  await expect(edit.getByLabel('Installed (UTC)', { exact: true })).toHaveValue('1900-01-10T12:00')
  await edit.getByLabel('Notes', { exact: true }).fill('Inspection verified by browser test.')
  await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(edit.getByRole('alert')).toContainText('Temporary save failure')
  await expect(edit.getByLabel('Notes', { exact: true })).toHaveValue('Inspection verified by browser test.')
  const unchanged = await (await page.request.get(`/api/assets/${created.id}`)).json()
  expect(unchanged.notes).toBe('')
  await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(details.getByText('Inspection verified by browser test.', { exact: true })).toBeVisible()
  await page.reload()
  // Locate the saved asset through the real filtered API; the initial list needn't contain it.
  const stored = await (await page.request.get(`/api/assets/${created.id}`)).json()
  expect(stored).toMatchObject({ notes: 'Inspection verified by browser test.', installed_at: created.installed_at, last_inspected_at: created.last_inspected_at })
  await page.getByRole('button', { name: `Select ${name}`, exact: true }).click()
  await details.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete asset', exact: true }).click()
  await expect(list.getByText('150 matching assets')).toBeVisible()
  await expect(map.getByText('150 matching assets')).toBeVisible()
  expect((await page.request.get(`/api/assets/${created.id}`)).status()).toBe(404)
  expect(errors).toEqual([])
})
