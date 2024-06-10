/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom/extend-expect'
import { screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";

import router from "../app/Router.js";
import Bills from "../containers/Bills.js";
import { formatDate, formatStatus } from "../app/format.js";
$.fn.modal = jest.fn();

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be active-icon", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }));
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId('icon-window'));
      const windowIcon = screen.getByTestId('icon-window');
      //to-do write expect expression
      expect(windowIcon).toHaveClass('active-icon')
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML);
      const antiChrono = (a, b) => ((a < b) ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
  });
});

describe("Given I am on the Bills Page as an employee", () => {
  
  describe("When I click on the new bill button", () => {
    test("Then it should navigate to the New Bill page", () => {
      const onNavigate = jest.fn();
      const container = new Bills({
        document: document,
        onNavigate: onNavigate,
        store: null,
        localStorage: localStorageMock
      });
      const buttonNewBill = document.querySelector(`button[data-testid="btn-new-bill"]`);
      buttonNewBill.click();
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['NewBill']);
    });
  });

  describe("When I try to retrieve the bills list", () => {
    test("Then it should fetch and format the bills correctly", async () => {
      const mockedBills = [
        { date: new Date(), status: "pending" },
        { date: new Date(), status: "accepted" }
      ];
      const formattedBills = mockedBills.map(bill => ({
        ...bill,
        date: formatDate(bill.date),
        status: formatStatus(bill.status)
      }));

      const mockedStore = {
        bills: jest.fn(() => ({
          list: jest.fn(() => Promise.resolve(mockedBills))
        }))
      };

      const container = new Bills({
        document: document,
        onNavigate: jest.fn(),
        store: mockedStore,
        localStorage: localStorageMock
      });

      const fetchedBills = await container.getBills();

      expect(fetchedBills).toEqual(formattedBills);
    });
  });

  describe("When I click on the eye icon of a bill", () => {
    test("Then it should display the bill image in a modal", () => {
      // Set up our document body
      document.body.innerHTML = `
        <div id="modaleFile" class="modal fade">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-body"></div>
            </div>
          </div>
        </div>
        <div>
          <span data-testid="icon-eye" data-bill-url="https://example.com/bill.jpg"></span>
        </div>
      `;

      const bills = new Bills({
        document: document,
        onNavigate: jest.fn(),
        store: null,
        localStorage: localStorageMock
      });

      const iconEye = screen.getByTestId('icon-eye');
      bills.handleClickIconEye(iconEye);

      const modalBody = document.querySelector('#modaleFile .modal-body');
      const img = modalBody.querySelector('img');

      expect(modalBody).toBeTruthy();
      expect(img).toBeTruthy();
      expect(img.src).toBe('https://example.com/bill.jpg');
      
      // Verify that the modal function was called to show the modal
      expect($.fn.modal).toHaveBeenCalledWith('show');
    });
  });

  
});

