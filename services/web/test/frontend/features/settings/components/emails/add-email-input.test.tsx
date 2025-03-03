import {
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import { expect } from 'chai'
import sinon from 'sinon'
import fetchMock from 'fetch-mock'
import {
  AddEmailInput,
  clearDomainCache,
} from '../../../../../../frontend/js/features/settings/components/emails/add-email-input'

const testInstitutionData = [
  { university: { id: 124 }, hostname: 'domain.edu' },
]

describe('<AddEmailInput/>', function () {
  const defaultProps = {
    onChange: (value: string) => {},
  }

  beforeEach(function () {
    clearDomainCache()
    fetchMock.reset()
  })

  describe('on initial render', function () {
    it('should render an input with a placeholder', function () {
      render(<AddEmailInput {...defaultProps} />)
      screen.getByPlaceholderText('e.g. johndoe@mit.edu')
    })

    it('should not dispatch any `change` event', function () {
      const onChangeStub = sinon.stub()
      render(<AddEmailInput {...defaultProps} onChange={onChangeStub} />)
      expect(onChangeStub.called).to.equal(false)
    })
  })

  describe('when typing text that does not contain any potential domain match', function () {
    let onChangeStub

    beforeEach(function () {
      fetchMock.get('express:/institutions/domains', 200)
      onChangeStub = sinon.stub()
      render(<AddEmailInput {...defaultProps} onChange={onChangeStub} />)
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'user' },
      })
    })

    it('should render the text being typed', function () {
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).to.equal('user')
    })

    it('should dispatch a `change` event on every stroke', function () {
      expect(onChangeStub.calledWith('user')).to.equal(true)
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 's' },
      })
      expect(onChangeStub.calledWith('s')).to.equal(true)
    })

    it('should not make any request for institution domains', function () {
      expect(fetchMock.called()).to.be.false
    })
  })

  describe('when typing text that contains a potential domain match', function () {
    let onChangeStub

    beforeEach(function () {
      onChangeStub = sinon.stub()
      render(<AddEmailInput onChange={onChangeStub} />)
    })

    describe('when there are no matches', function () {
      beforeEach(function () {
        fetchMock.get('express:/institutions/domains', 200)
        fireEvent.change(screen.getByRole('textbox'), {
          target: { value: 'user@d' },
        })
      })

      it('should render the text being typed', function () {
        const input = screen.getByRole('textbox') as HTMLInputElement
        expect(input.value).to.equal('user@d')
      })
    })

    describe('when there is a domain match', function () {
      beforeEach(function () {
        fetchMock.get('express:/institutions/domains', testInstitutionData)
        fireEvent.change(screen.getByRole('textbox'), {
          target: { value: 'user@d' },
        })
      })

      it('should render the text being typed along with the suggestion', async function () {
        const input = screen.getByRole('textbox') as HTMLInputElement
        expect(input.value).to.equal('user@d')
        await screen.findByText('user@domain.edu')
      })

      it('should dispatch a `change` event with the typed text', function () {
        expect(onChangeStub.calledWith('user@d')).to.equal(true)
      })

      it('should dispatch a `change` event with institution data when the typed email contains the institution domain', async function () {
        fireEvent.change(screen.getByRole('textbox'), {
          target: { value: 'user@domain.edu' },
        })
        await fetchMock.flush(true)
        expect(
          onChangeStub.calledWith(
            'user@domain.edu',
            sinon.match(testInstitutionData[0])
          )
        ).to.equal(true)
      })

      it('should clear the suggestion when the potential domain match is completely deleted', function () {
        fireEvent.change(screen.getByRole('textbox'), {
          target: { value: 'user@' },
        })
        expect(onChangeStub.calledWith('user@')).to.equal(true)
        expect(screen.queryByText('user@domain.edu')).to.be.null
      })

      describe('when there is a suggestion and "Tab" key is pressed', function () {
        beforeEach(async function () {
          await screen.findByText('user@domain.edu') // wait until autocompletion available
          fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Tab' })
        })

        it('it should autocomplete the input', async function () {
          const input = screen.getByRole('textbox') as HTMLInputElement
          expect(input.value).to.equal('user@domain.edu')
        })

        it('should dispatch a `change` event with the domain matched', async function () {
          expect(
            onChangeStub.calledWith(
              'user@domain.edu',
              sinon.match(testInstitutionData[0])
            )
          ).to.equal(true)
        })
      })

      describe('when there is a suggestion and "Enter" key is pressed', function () {
        beforeEach(async function () {
          await screen.findByText('user@domain.edu') // wait until autocompletion available
          fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
        })

        it('it should autocomplete the input', async function () {
          const input = screen.getByRole('textbox') as HTMLInputElement
          expect(input.value).to.equal('user@domain.edu')
        })

        it('should dispatch a `change` event with the domain matched', async function () {
          expect(
            onChangeStub.calledWith(
              'user@domain.edu',
              sinon.match(testInstitutionData[0])
            )
          ).to.equal(true)
        })
      })

      it('should cache the result and skip subsequent requests', async function () {
        fetchMock.reset()

        // clear input
        fireEvent.change(screen.getByRole('textbox'), {
          target: { value: '' },
        })
        // type a hint to trigger the domain search
        fireEvent.change(screen.getByRole('textbox'), {
          target: { value: 'user@d' },
        })

        expect(fetchMock.called()).to.be.false
        expect(onChangeStub.calledWith('user@d')).to.equal(true)
        await screen.findByText('user@domain.edu')
      })
    })

    describe('while waiting for a response', function () {
      beforeEach(async function () {
        // type an initial suggestion
        fetchMock.get('express:/institutions/domains', testInstitutionData)
        fireEvent.change(screen.getByRole('textbox'), {
          target: { value: 'user@d' },
        })
        await screen.findByText('user@domain.edu')

        // make sure the next suggestions are delayed
        clearDomainCache()
        fetchMock.reset()
        fetchMock.get('express:/institutions/domains', 200, { delay: 1000 })
      })

      it('should keep the suggestion if the hint matches the previously matched domain', async function () {
        fireEvent.change(screen.getByRole('textbox'), {
          target: { value: 'user@do' },
        })
        screen.getByText('user@domain.edu')
      })

      it('should remove the suggestion if the hint does not match the previously matched domain', async function () {
        fireEvent.change(screen.getByRole('textbox'), {
          target: { value: 'user@foo' },
        })
        expect(screen.queryByText('user@domain.edu')).to.be.null
      })
    })
  })

  describe('when the request to fetch institution domains fail', function () {
    let onChangeStub

    beforeEach(async function () {
      // initial request populates the suggestion
      fetchMock.get('express:/institutions/domains', testInstitutionData)
      onChangeStub = sinon.stub()
      render(<AddEmailInput {...defaultProps} onChange={onChangeStub} />)
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'user@d' },
      })
      await screen.findByText('user@domain.edu')

      // subsequent requests fail
      fetchMock.reset()
      fetchMock.get('express:/institutions/domains', 500)
    })

    it('should clear suggestions', async function () {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'user@dom' },
      })

      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).to.equal('user@dom')

      await waitForElementToBeRemoved(() =>
        screen.queryByText('user@domain.edu')
      )

      expect(fetchMock.called()).to.be.true // ensures `domainCache` hasn't been hit
    })
  })
})
