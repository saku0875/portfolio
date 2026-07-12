class Api::V1::WorksController < ApplicationController
  skip_before_action :authenticate_request, only: [:index]

  def index
    works = Work.published.ordered
    render json: works.as_json(
      only: [:id, :title, :description, :tech_stack, :video_url, :thumbnail_url, :github_url, :demo_url]
    )
  end
end